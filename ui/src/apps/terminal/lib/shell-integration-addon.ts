import type { IMarker, ITerminalAddon, Terminal } from "@xterm/xterm";

export interface Command {
  marker: IMarker;
  promptEndMarker?: IMarker;
  executedMarker?: IMarker;
  finishedMarker?: IMarker;
  commandLine?: string;
  exitCode?: number;
  cwd?: string;
}

export interface ShellIntegrationEvents {
  onCommandStarted?: (command: Command) => void;
  onCommandFinished?: (command: Command) => void;
  onCwdChanged?: (cwd: string) => void;
}

const OSC_PS_VSCODE = 633;

export class ShellIntegrationAddon implements ITerminalAddon {
  #terminal: Terminal | null = null;
  #currentCommand: Command | null = null;
  #events: ShellIntegrationEvents;
  #commands: Command[] = [];

  constructor(events: ShellIntegrationEvents = {}) {
    this.#events = events;
  }

  activate(terminal: Terminal): void {
    this.#terminal = terminal;

    terminal.parser.registerOscHandler(OSC_PS_VSCODE, (data) => {
      return this.#handleVSCodeSequence(data);
    });
  }

  dispose(): void {
    this.#terminal = null;
    this.#currentCommand = null;
    this.#commands = [];
  }

  get commands(): Command[] {
    return this.#commands;
  }

  get currentCommand(): Command | null {
    return this.#currentCommand;
  }

  #handleVSCodeSequence(data: string): boolean {
    if (!this.#terminal) return false;

    const [code, ...args] = data.split(";");

    switch (code) {
      case "A":
        this.#handlePromptStart();
        break;
      case "B":
        this.#handleCommandStart();
        break;
      case "C":
        this.#handleCommandExecuted();
        break;
      case "D":
        this.#handleCommandFinished(args[0]);
        break;
      case "E":
        this.#handleCommandLine(args);
        break;
      case "P":
        this.#handleProperty(args[0]);
        break;
    }

    return true;
  }

  #handlePromptStart(): void {
    if (!this.#terminal) return;

    const marker = this.#terminal.registerMarker(0);
    if (!marker) return;

    this.#currentCommand = {
      marker,
    };
  }

  #handleCommandStart(): void {
    if (!this.#terminal || !this.#currentCommand) return;

    const marker = this.#terminal.registerMarker(0);
    if (marker) {
      this.#currentCommand.promptEndMarker = marker;
    }

    this.#events.onCommandStarted?.(this.#currentCommand);
  }

  #handleCommandExecuted(): void {
    if (!this.#terminal || !this.#currentCommand) return;

    const marker = this.#terminal.registerMarker(0);
    if (marker) {
      this.#currentCommand.executedMarker = marker;
    }
  }

  #handleCommandFinished(exitCodeStr?: string): void {
    if (!this.#terminal || !this.#currentCommand) return;

    const marker = this.#terminal.registerMarker(0);
    if (marker) {
      this.#currentCommand.finishedMarker = marker;
    }

    if (exitCodeStr !== undefined && exitCodeStr !== "") {
      this.#currentCommand.exitCode = parseInt(exitCodeStr, 10);
    }

    this.#commands.push(this.#currentCommand);
    this.#events.onCommandFinished?.(this.#currentCommand);
    this.#currentCommand = null;
  }

  #handleCommandLine(args: string[]): void {
    if (!this.#currentCommand) return;

    if (args.length > 0) {
      this.#currentCommand.commandLine = this.#unescapeCommandLine(args[0]);
    }
  }

  #handleProperty(property: string): void {
    if (!property) return;

    const eqIndex = property.indexOf("=");
    if (eqIndex === -1) return;

    const key = property.substring(0, eqIndex);
    const value = property.substring(eqIndex + 1);

    if (key === "Cwd") {
      if (this.#currentCommand) {
        this.#currentCommand.cwd = value;
      }
      this.#events.onCwdChanged?.(value);
    }
  }

  #unescapeCommandLine(escaped: string): string {
    return escaped
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      )
      .replace(/\\;/g, ";")
      .replace(/\\\\/g, "\\");
  }
}
