import type { IDecoration, ITerminalAddon, Terminal } from "@xterm/xterm";

import type { Command, ShellIntegrationAddon } from "./shell-integration-addon";

export interface DecorationAddonOptions {
  shellIntegration: ShellIntegrationAddon;
}

interface CommandDecoration {
  command: Command;
  decoration: IDecoration;
}

export class DecorationAddon implements ITerminalAddon {
  #terminal: Terminal | null = null;
  #decorations: CommandDecoration[] = [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_options: DecorationAddonOptions) {
    // Options reserved for future use (e.g., subscribing to shell integration events)
  }

  activate(terminal: Terminal): void {
    this.#terminal = terminal;
  }

  dispose(): void {
    for (const { decoration } of this.#decorations) {
      decoration.dispose();
    }
    this.#decorations = [];
    this.#terminal = null;
  }

  registerCommandDecoration(command: Command, isRunning: boolean): void {
    if (!this.#terminal || !command.marker) return;

    const decoration = this.#terminal.registerDecoration({
      marker: command.marker,
      x: 0,
      width: 1,
      height: 1,
    });

    if (!decoration) return;

    decoration.onRender((element) => {
      this.#renderDecoration(element, command, isRunning);
    });

    this.#decorations.push({ command, decoration });
  }

  updateCommandDecoration(command: Command): void {
    const item = this.#decorations.find((d) => d.command === command);
    if (!item || !item.decoration.element) return;

    this.#renderDecoration(item.decoration.element, command, false);
  }

  #renderDecoration(
    element: HTMLElement,
    command: Command,
    isRunning: boolean,
  ): void {
    element.style.width = "8px";
    element.style.height = "100%";
    element.style.display = "flex";
    element.style.alignItems = "center";
    element.style.justifyContent = "center";
    element.style.marginLeft = "-12px";

    const icon = document.createElement("span");
    icon.style.width = "6px";
    icon.style.height = "6px";
    icon.style.borderRadius = "50%";

    if (isRunning || command.exitCode === undefined) {
      icon.style.backgroundColor = "#6b7280";
      icon.style.opacity = "0.5";
    } else if (command.exitCode === 0) {
      icon.style.backgroundColor = "#22c55e";
    } else {
      icon.style.backgroundColor = "#ef4444";
    }

    element.innerHTML = "";
    element.appendChild(icon);
  }
}
