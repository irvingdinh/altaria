import { type ChildProcess, spawn } from "child_process";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");

export interface ServerProcess {
  process: ChildProcess;
  url: string;
}

export function startApiServer(port: number, dataDir: string): ServerProcess {
  const proc = spawn("npm", ["start"], {
    cwd: path.join(ROOT, "api"),
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      DATA_DIR: dataDir,
    },
    stdio: "pipe",
  });

  proc.stdout?.on("data", (data) => {
    if (process.env.E2E_DEBUG) {
      process.stdout.write(`[api] ${data}`);
    }
  });
  proc.stderr?.on("data", (data) => {
    if (process.env.E2E_DEBUG) {
      process.stderr.write(`[api] ${data}`);
    }
  });

  return { process: proc, url: `http://localhost:${port}` };
}

export function startUiServer(port: number, apiPort: number): ServerProcess {
  const proc = spawn("bunx", ["vite", "--host", "0.0.0.0", "--port", String(port)], {
    cwd: path.join(ROOT, "ui"),
    env: {
      ...process.env,
      VITE_API_PORT: String(apiPort),
    },
    stdio: "pipe",
  });

  proc.stdout?.on("data", (data) => {
    if (process.env.E2E_DEBUG) {
      process.stdout.write(`[ui] ${data}`);
    }
  });
  proc.stderr?.on("data", (data) => {
    if (process.env.E2E_DEBUG) {
      process.stderr.write(`[ui] ${data}`);
    }
  });

  return { process: proc, url: `http://localhost:${port}` };
}

export async function waitForHealthy(
  url: string,
  timeout = 30_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not become healthy within ${timeout}ms`);
}

export function killProcess(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (proc.killed || proc.exitCode !== null) {
      resolve();
      return;
    }
    proc.on("exit", () => resolve());
    proc.kill("SIGTERM");
    setTimeout(() => {
      if (!proc.killed && proc.exitCode === null) {
        proc.kill("SIGKILL");
      }
    }, 5_000);
  });
}
