import { defineConfig } from "@playwright/test";

export const API_PORT = 13350;
export const UI_PORT = 5174;
export const API_BASE = `http://localhost:${API_PORT}`;
export const UI_BASE = `http://localhost:${UI_PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  use: {
    baseURL: UI_BASE,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
});
