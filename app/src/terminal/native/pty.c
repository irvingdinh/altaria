/*
 * pty.c — Native C library for pseudo-terminal (PTY) management.
 *
 * This file provides low-level functions that Bun's FFI (Foreign Function
 * Interface) calls into. It creates and manages PTY sessions — the same
 * mechanism that terminal emulators like iTerm2, Terminal.app, or VS Code's
 * integrated terminal use to run shell processes.
 *
 * WHAT IS A PTY?
 * A pseudo-terminal is a pair of virtual devices:
 *   - "master" side: your application reads/writes here (like the terminal UI)
 *   - "slave" side: the shell process (e.g. /bin/zsh) reads/writes here
 *
 * Whatever you write to the master appears as input to the shell.
 * Whatever the shell outputs goes to the master for your app to read.
 * It's essentially a bidirectional pipe that also emulates terminal behavior
 * (line editing, signal handling, screen size, etc.).
 *
 * ERROR CONVENTION:
 * All functions in this file return negative errno values on failure
 * (e.g., -ENOENT = -2, -EPERM = -1). This is a common C convention that
 * lets callers distinguish errors from valid return values using a single
 * integer return. The caller (TypeScript via FFI) checks if return < 0
 * to detect errors.
 */

/* --- Standard C library headers --- */

#include <errno.h>    /* errno — global variable set by syscalls on failure.
                         Contains error codes like ENOENT (file not found),
                         EPERM (permission denied), etc. */

#include <fcntl.h>    /* File control options. Provides fcntl() for manipulating
                         file descriptor flags, and constants like O_NONBLOCK
                         (non-blocking I/O mode). */

#include <signal.h>   /* Signal handling. Provides kill() to send signals
                         (like SIGTERM, SIGKILL) to processes. */

#include <stdlib.h>   /* Standard library. Provides setenv(), getenv(), _exit().
                         setenv sets environment variables, getenv reads them. */

#include <string.h>   /* String utilities. Provides memset() used here to
                         zero-initialize structs before populating them. */

#include <sys/ioctl.h> /* I/O control. Provides ioctl() — a catch-all syscall
                          for device-specific operations. Here it's used with
                          TIOCSWINSZ to change terminal window size. */

#include <sys/wait.h> /* Process waiting. Provides waitpid() and macros like
                         WIFEXITED (did process exit normally?),
                         WEXITSTATUS (what exit code?),
                         WIFSIGNALED (was process killed by signal?),
                         WTERMSIG (which signal killed it?). */

#include <unistd.h>   /* POSIX API. Provides core Unix functions:
                         read(), write(), close(), execl(), fork(), _exit().
                         These are the fundamental building blocks of Unix I/O
                         and process management. */

/*
 * Platform-specific PTY header.
 *
 * The forkpty() function we use below is NOT part of the POSIX standard —
 * it's a convenience function provided by different headers on different OSes:
 *   - macOS: <util.h>
 *   - Linux: <pty.h>
 *
 * The #ifdef __APPLE__ preprocessor directive checks at compile time which
 * platform we're building for, and includes the correct header.
 */
#ifdef __APPLE__
#include <util.h>
#else
#include <pty.h>
#endif

/*
 * spawn_pty — Create a new PTY and spawn a shell process inside it.
 *
 * Parameters:
 *   master_fd_out — Pointer to an int where we'll store the master file
 *                   descriptor. The caller uses this FD to read/write to
 *                   the shell. (This is an "out parameter" — a C pattern
 *                   similar to passing by reference in other languages.)
 *   rows          — Initial terminal height in character rows (e.g. 24)
 *   cols          — Initial terminal width in character columns (e.g. 80)
 *
 * Returns:
 *   > 0 : The PID (process ID) of the child shell process (success)
 *   < 0 : Negative errno on failure
 *
 * HOW IT WORKS:
 * This function calls forkpty(), which does THREE things in one call:
 *   1. Creates a new PTY pair (master + slave devices)
 *   2. Calls fork() to create a child process
 *   3. In the child: connects stdin/stdout/stderr to the slave PTY
 *
 * After forkpty(), the code splits into two execution paths:
 *   - pid == 0: We're in the CHILD process → set up env and exec a shell
 *   - pid > 0:  We're in the PARENT process → return the master FD and PID
 */
int spawn_pty(int *master_fd_out, int rows, int cols) {
  /*
   * struct winsize — Tells the PTY what terminal dimensions to use.
   *
   * This matters because many CLI programs (vim, htop, ls with columns)
   * query the terminal size to format their output. The PTY propagates
   * this info to the child process via the TIOCGWINSZ ioctl.
   *
   * memset zeroes out the entire struct first. This is a safety practice
   * in C to ensure no garbage values in fields we don't explicitly set
   * (like ws_xpixel and ws_ypixel, which represent pixel dimensions).
   */
  struct winsize ws;
  memset(&ws, 0, sizeof(ws));
  ws.ws_row = (unsigned short)rows;
  ws.ws_col = (unsigned short)cols;

  int master_fd;

  /*
   * forkpty() — The key function. It combines:
   *   1. openpty() — creates a PTY master/slave pair
   *   2. fork()    — creates a child process (a copy of the current process)
   *   3. login_tty() — in the child, makes the slave PTY the controlling
   *                    terminal and redirects stdin/stdout/stderr to it
   *
   * Arguments:
   *   &master_fd — Output: receives the master side file descriptor
   *   NULL       — We don't need the slave device name (e.g., "/dev/pts/3")
   *   NULL       — We don't need custom termios settings (terminal config
   *                like baud rate, echo mode, etc.)
   *   &ws        — Initial window size for the PTY
   *
   * Returns:
   *   < 0  — Error (fork failed)
   *   == 0 — We are in the child process
   *   > 0  — We are in the parent process, value is the child's PID
   *
   * IMPORTANT: After fork, BOTH parent and child continue executing from
   * this exact point. The only way to tell them apart is the return value.
   * This is a fundamental Unix concept — fork creates two nearly identical
   * processes that diverge based on the return value.
   */
  pid_t pid = forkpty(&master_fd, NULL, NULL, &ws);

  if (pid < 0) {
    /* forkpty failed. Return the error as a negative errno.
     * Common reasons: too many processes, out of PTY devices. */
    return -errno;
  }

  if (pid == 0) {
    /*
     * === CHILD PROCESS ===
     *
     * We're now running inside the forked child. At this point:
     *   - stdin, stdout, stderr are connected to the slave side of the PTY
     *   - The parent holds the master side and can read our output / send input
     *
     * We set up the environment and then replace this process with a shell.
     */

    /*
     * Set terminal-related environment variables so programs inside the
     * shell know they're running in a capable terminal:
     *   - TERM=xterm-256color: Tells programs we support 256 colors and
     *     xterm-compatible escape sequences (cursor movement, etc.)
     *   - COLORTERM=truecolor: Tells programs we support 24-bit RGB colors
     *
     * The third argument (1) means "overwrite if already exists".
     */
    setenv("TERM", "xterm-256color", 1);
    setenv("COLORTERM", "truecolor", 1);

    /*
     * Determine which shell to run. We respect the user's preference by
     * checking the SHELL environment variable (set by the OS to the user's
     * default shell, e.g., "/bin/zsh" or "/bin/bash").
     * Falls back to "/bin/sh" (the basic POSIX shell) if SHELL is not set.
     */
    const char *shell = getenv("SHELL");
    if (!shell) {
      shell = "/bin/sh";
    }

    /*
     * execl() — Replace the current process image with the shell program.
     *
     * This is NOT like "starting a program" in higher-level languages.
     * execl literally REPLACES the current process. The C code after this
     * line will NEVER execute (unless execl fails).
     *
     * Arguments:
     *   shell        — Path to the executable (e.g., "/bin/zsh")
     *   shell        — argv[0], conventionally the program name. Programs
     *                  check argv[0] to know how they were invoked.
     *   (char *)NULL — Marks the end of the argument list (C variadic
     *                  functions need a sentinel/terminator value)
     *
     * If execl succeeds, this process IS now the shell.
     * The shell's stdin/stdout/stderr are the PTY slave, so everything
     * it reads/writes goes through the PTY master in the parent.
     */
    execl(shell, shell, (char *)NULL);

    /*
     * If we reach here, execl() failed (e.g., shell binary not found).
     *
     * _exit(127) immediately terminates the child process.
     * We use _exit() instead of exit() because:
     *   - exit() runs cleanup handlers (atexit), flushes stdio buffers, etc.
     *   - _exit() exits immediately without cleanup
     *   - In a forked child that failed to exec, running the parent's
     *     cleanup handlers could cause corruption (double-flushing buffers,
     *     double-closing files, etc.)
     *
     * Exit code 127 is the conventional code meaning "command not found"
     * (same code bash uses when a command doesn't exist).
     */
    _exit(127);
  }

  /*
   * === PARENT PROCESS ===
   *
   * We get here only in the parent (pid > 0).
   * The child is now running the shell in its own process.
   *
   * We store the master file descriptor in the caller's variable
   * (via the pointer) and return the child's PID.
   *
   * The caller will use master_fd to:
   *   - read() from it to get the shell's output
   *   - write() to it to send keystrokes/commands to the shell
   * And use the PID to:
   *   - Monitor if the shell is still running (waitpid)
   *   - Send signals to it (kill)
   */
  *master_fd_out = master_fd;
  return pid;
}

/*
 * read_pty — Read output from the shell via the master PTY file descriptor.
 *
 * Parameters:
 *   fd    — The master file descriptor (from spawn_pty)
 *   buf   — Buffer to store the data read from the PTY
 *   count — Maximum number of bytes to read
 *
 * Returns:
 *   > 0 : Number of bytes actually read
 *   == 0: EOF — the slave side was closed (shell exited)
 *   < 0 : Negative errno on error
 *
 * This is a thin wrapper around the POSIX read() syscall.
 * The data read is raw terminal output, which includes:
 *   - Printable text the shell outputs
 *   - ANSI escape sequences (colors, cursor movement, screen clearing)
 *   - Control characters
 * The TypeScript side (xterm.js) interprets all of this.
 */
ssize_t read_pty(int fd, char *buf, size_t count) {
  ssize_t n = read(fd, buf, count);
  if (n < 0) {
    return -errno;
  }
  return n;
}

/*
 * write_pty — Send input to the shell via the master PTY file descriptor.
 *
 * Parameters:
 *   fd    — The master file descriptor (from spawn_pty)
 *   buf   — Buffer containing the data to send (e.g., keystrokes)
 *   count — Number of bytes to write
 *
 * Returns:
 *   > 0 : Number of bytes actually written
 *   < 0 : Negative errno on error
 *
 * When you type "ls\n" in the terminal UI, the TypeScript layer calls
 * this function with those bytes. The PTY delivers them to the shell's
 * stdin as if they were typed on a real keyboard.
 */
ssize_t write_pty(int fd, const char *buf, size_t count) {
  ssize_t n = write(fd, buf, count);
  if (n < 0) {
    return -errno;
  }
  return n;
}

/*
 * set_nonblock — Set a file descriptor to non-blocking mode.
 *
 * Parameters:
 *   fd — The file descriptor to modify
 *
 * Returns:
 *   0  : Success
 *   < 0: Negative errno on error
 *
 * WHY NON-BLOCKING?
 * By default, read() on a file descriptor BLOCKS — it pauses your entire
 * thread until data is available. In a server handling multiple PTY sessions,
 * you don't want one idle shell to freeze everything.
 *
 * In non-blocking mode, read() returns immediately with EAGAIN (-11) if
 * there's no data available, instead of waiting. This lets the event loop
 * (Bun's runtime) efficiently poll multiple file descriptors.
 *
 * HOW IT WORKS:
 * fcntl (file control) is a Swiss Army knife syscall for file descriptor ops.
 *   1. F_GETFL — Get the current flags for this FD (e.g., read/write mode)
 *   2. F_SETFL — Set new flags. We OR (|) in O_NONBLOCK to add it without
 *      removing existing flags. This is a bitwise operation — flags are
 *      stored as individual bits in an integer, and OR sets a bit without
 *      affecting others.
 *
 * Think of it like: currentFlags = { readable, writable }
 *                   newFlags = currentFlags + { nonBlocking }
 */
int set_nonblock(int fd) {
  int flags = fcntl(fd, F_GETFL, 0);
  if (flags < 0) {
    return -errno;
  }
  if (fcntl(fd, F_SETFL, flags | O_NONBLOCK) < 0) {
    return -errno;
  }
  return 0;
}

/*
 * close_fd — Close a file descriptor, releasing the underlying resource.
 *
 * Parameters:
 *   fd — The file descriptor to close
 *
 * Returns:
 *   0  : Success
 *   < 0: Negative errno on error
 *
 * In C, you must manually close file descriptors when done. Unlike
 * TypeScript/Go where the garbage collector or defer handles cleanup,
 * forgetting to close an FD in C causes a resource leak. Each process
 * has a limited number of available FDs (typically 1024 or 65536).
 *
 * Closing the master FD of a PTY also signals to the slave side that
 * the terminal is gone, which typically causes the shell to receive
 * SIGHUP (hangup signal) and exit.
 */
int close_fd(int fd) {
  if (close(fd) < 0) {
    return -errno;
  }
  return 0;
}

/*
 * kill_process — Send a signal to a process.
 *
 * Parameters:
 *   pid — Process ID of the target process
 *   sig — Signal number to send (e.g., SIGTERM=15, SIGKILL=9)
 *
 * Returns:
 *   0  : Success (signal was sent; doesn't mean process is dead yet)
 *   < 0: Negative errno on error
 *
 * COMMON SIGNALS:
 *   SIGTERM (15) — "Please exit gracefully." The process can catch this
 *                  and clean up before exiting. This is the polite way.
 *   SIGKILL (9)  — "Die immediately." Cannot be caught or ignored.
 *                  The kernel forcibly terminates the process. Use as
 *                  a last resort when SIGTERM doesn't work.
 *   SIGHUP  (1)  — "Your terminal disconnected." Shells exit on this.
 *
 * Note: kill() is misleadingly named. It doesn't necessarily kill —
 * it sends ANY signal. The name is historical from early Unix.
 */
int kill_process(int pid, int sig) {
  if (kill(pid, sig) < 0) {
    return -errno;
  }
  return 0;
}

/*
 * wait_process — Check if a child process has exited (non-blocking).
 *
 * Parameters:
 *   pid — Process ID to check
 *
 * Returns:
 *   0       : Process is still running (hasn't exited yet)
 *   1-255   : Process exited normally with this exit code
 *             (0 = success, non-zero = error, by convention)
 *   129-255 : Process was killed by a signal. The value is 128 + signal number.
 *             E.g., killed by SIGKILL(9) → returns 137 (128+9).
 *             This convention matches how bash reports signal deaths.
 *   < 0     : Negative errno on error (e.g., invalid PID)
 *
 * WNOHANG FLAG:
 * waitpid() normally BLOCKS until the child exits. WNOHANG makes it
 * non-blocking: if the child is still running, return immediately with 0
 * instead of waiting. This lets the caller poll periodically.
 *
 * ZOMBIE PROCESSES:
 * When a child process exits, it becomes a "zombie" — it's dead but its
 * exit status is kept in the kernel's process table until the parent calls
 * waitpid(). This function both checks the status AND reaps the zombie,
 * freeing the kernel resources. If you never call waitpid(), zombie
 * processes accumulate (visible as "Z" state in `ps`).
 *
 * WIFEXITED / WEXITSTATUS / WIFSIGNALED / WTERMSIG:
 * These are macros that decode the raw status integer from waitpid().
 * The status int packs multiple pieces of info into one value using
 * bit manipulation — these macros extract the relevant parts:
 *   WIFEXITED(status)   — Did the process exit via exit() or return?
 *   WEXITSTATUS(status) — If yes, what was the exit code? (0-255)
 *   WIFSIGNALED(status) — Was the process killed by a signal?
 *   WTERMSIG(status)    — If yes, which signal killed it?
 */
int wait_process(int pid) {
  int status;
  pid_t result = waitpid(pid, &status, WNOHANG);
  if (result < 0) {
    return -errno;
  }
  if (result == 0) {
    return 0; /* Still running */
  }
  if (WIFEXITED(status)) {
    return WEXITSTATUS(status);
  }
  if (WIFSIGNALED(status)) {
    return 128 + WTERMSIG(status);
  }
  return -1;
}

/*
 * resize_pty — Change the terminal dimensions of an existing PTY.
 *
 * Parameters:
 *   fd   — The master file descriptor of the PTY
 *   rows — New height in character rows
 *   cols — New width in character columns
 *
 * Returns:
 *   0  : Success
 *   < 0: Negative errno on error
 *
 * WHY THIS IS NEEDED:
 * When the user resizes their browser window (and thus the terminal UI),
 * the PTY needs to know the new dimensions. Programs running inside the
 * shell (like vim, htop, less) query the terminal size to lay out their
 * UI. If the PTY size doesn't match the actual display, you get garbled
 * output or misaligned content.
 *
 * HOW IT WORKS:
 * ioctl (I/O control) is a generic syscall for device-specific operations
 * that don't fit into read/write. TIOCSWINSZ is the specific command that
 * means "set the window size of this terminal device."
 *
 * When the kernel processes TIOCSWINSZ, it also sends SIGWINCH (window
 * change signal) to the foreground process group of the terminal. Programs
 * like vim catch SIGWINCH and redraw themselves at the new size.
 *
 * The flow is:
 *   Browser resize → TypeScript detects new size → calls resize_pty()
 *   → ioctl sets new size → kernel sends SIGWINCH → shell/vim redraws
 */
int resize_pty(int fd, int rows, int cols) {
  struct winsize ws;
  memset(&ws, 0, sizeof(ws));
  ws.ws_row = (unsigned short)rows;
  ws.ws_col = (unsigned short)cols;
  if (ioctl(fd, TIOCSWINSZ, &ws) < 0) {
    return -errno;
  }
  return 0;
}
