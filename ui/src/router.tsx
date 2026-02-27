import { type ComponentType } from "react";
import { createBrowserRouter } from "react-router";

const lazy =
  (importFn: () => Promise<{ default: ComponentType }>) =>
  async (): Promise<{ Component: ComponentType }> => {
    const { default: Component } = await importFn();
    return { Component };
  };

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: lazy(() => import("@/apps/core/pages/HomePage")),
  },
  {
    path: "/workspaces/:workspaceId",
    lazy: lazy(() => import("@/apps/workspace/pages/WorkspacePage")),
  },
]);
