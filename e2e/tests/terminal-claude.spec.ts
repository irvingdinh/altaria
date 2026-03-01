import { expect, test } from "@playwright/test";

import {
  cleanupAllWorkspaces,
  createWorkspaceViaApi,
} from "../helpers/api-client";
import { installOutputCollector, waitForTerminalOutput } from "../helpers/terminal";

// Claude responses can take a while
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

test.describe("Terminal — Claude", () => {
  test("create Claude session and interact", async ({ page }) => {
    const workspace = await createWorkspaceViaApi("Claude Test", "/tmp");

    // Install output collector before navigation
    await installOutputCollector(page);

    await page.goto(`/workspaces/${workspace.id}`);

    await openSidebar(page);

    // Find workspace and open its context menu
    const workspaceItem = page
      .locator('[data-sidebar="sidebar"] li')
      .filter({ hasText: "Claude Test" });
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

    // Claude Code is the default selection (#agent-claude)
    // Check the advanced flag: "Dangerously skip permissions"
    await page.locator("#advanced-flag").click();

    // Click "Create"
    await page.getByRole("button", { name: "Create" }).click();

    // Wait for dialog to close
    await expect(
      page.getByRole("heading", { name: "New Session" }),
    ).toBeHidden();

    // Wait for Claude to start (look for common prompt indicators)
    await waitForTerminalOutput(page, /claude|Claude|>|\$/, 30_000);

    // Send a simple question
    await page.keyboard.type("What is 2+2? Reply with just the number.");
    await page.keyboard.press("Shift+Enter");

    // Wait for Claude's response containing "4"
    await waitForTerminalOutput(page, "4", 60_000);
  });
});
