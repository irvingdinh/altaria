import { expect, test } from "@playwright/test";

import {
  cleanupAllWorkspaces,
  createWorkspaceViaApi,
} from "../helpers/api-client";

const openSidebar = async (page: import("@playwright/test").Page) => {
  // On mobile, sidebar is a Sheet overlay — open it via the header button
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

test.describe("Workspace CRUD", () => {
  test("create a workspace via sidebar", async ({ page }) => {
    await page.goto("/");

    await openSidebar(page);

    // Click the "New Workspace" button
    await page.locator('[title="New Workspace"]').click();

    // Wait for dialog to appear
    await expect(
      page.getByRole("heading", { name: "New Workspace" }),
    ).toBeVisible();

    // Fill in workspace name
    await page.locator("#workspace-name").fill("Test Workspace");

    // Select a directory from the DirectoryPicker — click the first directory
    // entry in the listing
    const directoryEntry = page
      .locator("form button[type='button']")
      .filter({ hasText: /^(?!Loading)/ })
      .first();
    await expect(directoryEntry).toBeVisible();
    await directoryEntry.click();

    // Click "Create"
    await page.getByRole("button", { name: "Create" }).click();

    // Wait for dialog to close
    await expect(
      page.getByRole("heading", { name: "New Workspace" }),
    ).toBeHidden();

    // Open sidebar again and verify workspace appears
    await openSidebar(page);
    await expect(page.getByText("Test Workspace")).toBeVisible();
  });

  test("edit a workspace name", async ({ page }) => {
    // Pre-create workspace via API
    await createWorkspaceViaApi("Original Name", "/tmp");

    await page.goto("/");
    await openSidebar(page);

    // Find the workspace and open its context menu
    const workspaceItem = page
      .locator('[data-sidebar="sidebar"] li')
      .filter({ hasText: "Original Name" });
    await expect(workspaceItem).toBeVisible();

    // Click the "More" button (SidebarMenuAction with sr-only "More")
    await workspaceItem
      .locator('button:has(> .sr-only, > span.sr-only)')
      .or(workspaceItem.getByRole("button").filter({ hasText: "More" }))
      .first()
      .click({ force: true });

    // Click "Edit" in the dropdown menu
    await page.getByRole("menuitem", { name: "Edit" }).click();

    // Wait for edit dialog
    await expect(
      page.getByRole("heading", { name: "Edit Workspace" }),
    ).toBeVisible();

    // Clear and type new name
    await page.locator("#workspace-name").clear();
    await page.locator("#workspace-name").fill("Updated Name");

    // Click "Save"
    await page.getByRole("button", { name: "Save" }).click();

    // Wait for dialog to close
    await expect(
      page.getByRole("heading", { name: "Edit Workspace" }),
    ).toBeHidden();

    // Verify update in sidebar
    await openSidebar(page);
    await expect(page.getByText("Updated Name")).toBeVisible();
    await expect(page.getByText("Original Name")).toBeHidden();
  });

  test("delete a workspace", async ({ page }) => {
    // Pre-create workspace via API
    await createWorkspaceViaApi("To Delete", "/tmp");

    await page.goto("/");
    await openSidebar(page);

    // Find the workspace and open its context menu
    const workspaceItem = page
      .locator('[data-sidebar="sidebar"] li')
      .filter({ hasText: "To Delete" });
    await expect(workspaceItem).toBeVisible();

    // Click the "More" button
    await workspaceItem
      .locator('button:has(> .sr-only, > span.sr-only)')
      .or(workspaceItem.getByRole("button").filter({ hasText: "More" }))
      .first()
      .click({ force: true });

    // Click "Delete" in the dropdown menu
    await page.getByRole("menuitem", { name: "Delete" }).click();

    // Wait for the confirmation dialog
    await expect(
      page.getByRole("heading", { name: "Delete workspace" }),
    ).toBeVisible();

    // Click "Delete" action button in the alert dialog
    await page
      .getByRole("button", { name: "Delete" })
      .filter({ hasNotText: "Deleting" })
      .click();

    // Wait for alert dialog to close
    await expect(
      page.getByRole("heading", { name: "Delete workspace" }),
    ).toBeHidden();

    // Verify workspace is gone from sidebar
    await openSidebar(page);
    await expect(page.getByText("To Delete")).toBeHidden();
  });
});
