import { expect, test } from "@playwright/test";

import {
  cleanupAllWorkspaces,
  createSessionViaApi,
  createWorkspaceViaApi,
} from "../helpers/api-client";
import {
  captureTerminalViaTmux,
  clearTerminalOutput,
  installOutputCollector,
  waitForTerminalOutput,
} from "../helpers/terminal";

test.beforeEach(async () => {
  await cleanupAllWorkspaces();
});

test.afterEach(async () => {
  await cleanupAllWorkspaces();
});

const openSidebar = async (page: import("@playwright/test").Page) => {
  await page.locator("header button").first().click();
  await expect(
    page.locator('[data-sidebar="sidebar"][data-mobile="true"]'),
  ).toBeVisible();
};

test.describe("Terminal — Native Shell", () => {
  test("create native shell session and execute a command", async ({
    page,
  }) => {
    const workspace = await createWorkspaceViaApi("Shell Test", "/tmp");
    const session = await createSessionViaApi(workspace.id, "native");

    // Install WebSocket output interceptor before navigation
    await installOutputCollector(page);

    // Navigate to the workspace with session
    await page.goto(
      `/workspaces/${workspace.id}?session=${session.id}`,
    );

    // Wait for shell prompt
    await waitForTerminalOutput(page, "$", 15_000);

    // Clear output buffer so we only check for new output
    await clearTerminalOutput(page);

    // Type a command and submit with Shift+Enter
    // On mobile (hover: none), Shift+Enter sends \r (the actual submit)
    await page.keyboard.type("echo hello-e2e");
    await page.keyboard.press("Shift+Enter");

    // Wait for command output
    await waitForTerminalOutput(page, "hello-e2e", 15_000);

    // Secondary verification via tmux
    const tmuxOutput = captureTerminalViaTmux(session.id);
    expect(tmuxOutput).toContain("hello-e2e");
  });

  test("create native session via UI dialog", async ({ page }) => {
    const workspace = await createWorkspaceViaApi("Dialog Shell Test", "/tmp");

    // Install output collector before navigation
    await installOutputCollector(page);

    await page.goto(`/workspaces/${workspace.id}`);

    await openSidebar(page);

    // Find the workspace and open its context menu
    const workspaceItem = page
      .locator('[data-sidebar="sidebar"] li')
      .filter({ hasText: "Dialog Shell Test" });
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

    // Select Native Shell
    await page.locator("#agent-native").click();

    // Click "Create"
    await page.getByRole("button", { name: "Create" }).click();

    // Wait for dialog to close
    await expect(
      page.getByRole("heading", { name: "New Session" }),
    ).toBeHidden();

    // Wait for shell prompt in terminal
    await waitForTerminalOutput(page, "$", 15_000);

    // Type a command and verify output
    await clearTerminalOutput(page);
    await page.keyboard.type("echo ui-shell-test");
    await page.keyboard.press("Shift+Enter");

    await waitForTerminalOutput(page, "ui-shell-test", 15_000);
  });
});
