import { execSync } from "child_process";
import type { Page } from "@playwright/test";

/**
 * Installs a WebSocket message interceptor that captures terminal output.
 * Must be called BEFORE navigating to the page (uses page.addInitScript).
 */
export async function installOutputCollector(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).__terminalOutput = "";
    const OrigWebSocket = window.WebSocket;
    (window as any).WebSocket = function (
      url: string | URL,
      protocols?: string | string[],
    ) {
      const ws = new OrigWebSocket(url, protocols);
      ws.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(String(event.data));
          if (msg.type === "output" && typeof msg.data === "string") {
            (window as any).__terminalOutput += msg.data;
          }
        } catch {
          // not JSON, ignore
        }
      });
      return ws;
    } as any;
    (window as any).WebSocket.prototype = OrigWebSocket.prototype;
    Object.defineProperty((window as any).WebSocket, "CONNECTING", {
      value: OrigWebSocket.CONNECTING,
    });
    Object.defineProperty((window as any).WebSocket, "OPEN", {
      value: OrigWebSocket.OPEN,
    });
    Object.defineProperty((window as any).WebSocket, "CLOSING", {
      value: OrigWebSocket.CLOSING,
    });
    Object.defineProperty((window as any).WebSocket, "CLOSED", {
      value: OrigWebSocket.CLOSED,
    });
  });
}

/**
 * Returns all terminal output captured so far.
 */
export async function getTerminalOutput(page: Page): Promise<string> {
  return page.evaluate(() => (window as any).__terminalOutput || "");
}

/**
 * Clears the captured terminal output buffer.
 */
export async function clearTerminalOutput(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as any).__terminalOutput = "";
  });
}

/**
 * Waits until the terminal output contains the expected string or matches
 * the expected regex pattern.
 */
export async function waitForTerminalOutput(
  page: Page,
  expected: string | RegExp,
  timeout = 15_000,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const output = await getTerminalOutput(page);
    if (typeof expected === "string") {
      if (output.includes(expected)) return output;
    } else {
      if (expected.test(output)) return output;
    }
    await page.waitForTimeout(500);
  }
  const finalOutput = await getTerminalOutput(page);
  throw new Error(
    `Terminal output did not contain "${expected}" within ${timeout}ms.\nCaptured output:\n${finalOutput}`,
  );
}

/**
 * Captures the current terminal pane content via tmux capture-pane.
 */
export function captureTerminalViaTmux(sessionId: string): string {
  try {
    return execSync(
      `tmux capture-pane -t altaria-${sessionId} -p -S -`,
      { encoding: "utf-8", timeout: 5_000 },
    ).trim();
  } catch {
    return "";
  }
}
