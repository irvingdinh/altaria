import { expect, test } from "@playwright/test";

import {
  cleanupAllWorkspaces,
  createWorkspaceViaApi,
} from "../helpers/api-client";
import { installOutputCollector, waitForTerminalOutput } from "../helpers/terminal";

// Codex responses can take a while
test.setTimeout(120_000);

const openSidebar = async (page: import("@playwright/test").Page) => {
  await page.locator("header button").first().click();
  await expect(
    page.locator('[data-sidebar="sidebar"][data-mobile="true"]'),
  ).toBeVisible();
};

test.beforeEach(async () => {
  await cleanupAllWorkspaces();
});

test.afterEach(async () => {
  await cleanupAllWorkspaces();
});

test.describe("Terminal — Codex", () => {
  test("create Codex session and interact", async ({ page }) => {
    const workspace = await createWorkspaceViaApi("Codex Test", "/tmp");

    // Install output collector before navigation
    await installOutputCollector(page);

    await page.goto(`/workspaces/${workspace.id}`);

    await openSidebar(page);

    // Find workspace and open its context menu
    const workspaceItem = page
      .locator('[data-sidebar="sidebar"] li')
      .filter({ hasText: "Codex Test" });
    await expect(workspaceItem).toBeVisible();

    // Click "More" button
    await workspaceItem
      .locator('button:has(> .sr-only, > span.sr-only)')
      .or(workspaceItem.getByRole("button").filter({ hasText: "More" }))
      .first()
      .click({ force: true });

    // Click "New Session"
    await page.getByRole("menuitem", { name: "New Session" }).click();

    // Wait for New Session dialog
    await expect(
      page.getByRole("heading", { name: "New Session" }),
    ).toBeVisible();

    // Select Codex CLI
    await page.locator("#agent-codex").click();

    // Check the advanced flag: "Full auto mode"
    await page.locator("#advanced-flag").click();

    // Click "Create"
    await page.getByRole("button", { name: "Create" }).click();

    // Wait for dialog to close
    await expect(
      page.getByRole("heading", { name: "New Session" }),
    ).toBeHidden();

    // Wait for Codex to start (look for common prompt indicators)
    await waitForTerminalOutput(page, /codex|Codex|>|\$/, 30_000);

    // Send a simple prompt
    await page.keyboard.type("What is 2+2? Reply with just the number.");
    await page.keyboard.press("Shift+Enter");

    // Wait for Codex's response containing "4"
    await waitForTerminalOutput(page, "4", 60_000);
  });
});
