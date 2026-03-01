import { execSync } from "child_process";
import { rmSync } from "fs";

import { killProcess } from "./helpers/server";

export default async function globalTeardown() {
  // Kill any altaria tmux sessions created during tests
  try {
    const sessions = execSync("tmux list-sessions -F '#{session_name}'", {
      encoding: "utf-8",
      timeout: 5_000,
    });
    for (const name of sessions.split("\n").filter(Boolean)) {
      if (name.startsWith("altaria-")) {
        try {
          execSync(`tmux kill-session -t ${name}`, { timeout: 5_000 });
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // tmux may not be running, ignore
  }

  const e2e = globalThis.__E2E__;
  if (!e2e) return;

  console.log("[e2e] Stopping API server...");
  await killProcess(e2e.apiProcess);

  console.log("[e2e] Stopping UI server...");
  await killProcess(e2e.uiProcess);

  console.log(`[e2e] Removing data directory: ${e2e.dataDir}`);
  try {
    rmSync(e2e.dataDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }

  console.log("[e2e] Teardown complete.");
}
