import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";

import { API_PORT, UI_PORT } from "./playwright.config";
import {
  startApiServer,
  startUiServer,
  waitForHealthy,
} from "./helpers/server";

declare global {
  var __E2E__: {
    apiProcess: import("child_process").ChildProcess;
    uiProcess: import("child_process").ChildProcess;
    dataDir: string;
  };
}

export default async function globalSetup() {
  const dataDir = mkdtempSync(path.join(tmpdir(), "altaria-e2e-"));
  console.log(`[e2e] Data directory: ${dataDir}`);

  console.log(`[e2e] Starting API server on port ${API_PORT}...`);
  const api = startApiServer(API_PORT, dataDir);

  console.log(`[e2e] Starting UI server on port ${UI_PORT}...`);
  const ui = startUiServer(UI_PORT, API_PORT);

  console.log("[e2e] Waiting for API to be healthy...");
  await waitForHealthy(`http://localhost:${API_PORT}/api/health`, 30_000);
  console.log("[e2e] API is healthy.");

  console.log("[e2e] Waiting for UI to be healthy...");
  await waitForHealthy(`http://localhost:${UI_PORT}`, 30_000);
  console.log("[e2e] UI is healthy.");

  globalThis.__E2E__ = {
    apiProcess: api.process,
    uiProcess: ui.process,
    dataDir,
  };
}
