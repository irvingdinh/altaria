import { AppLayout } from "@/apps/core/components/AppLayout/AppLayout.tsx";

export const HomePage = () => {
  return (
    <AppLayout className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Select a workspace from the sidebar to get started
        </p>
      </div>
    </AppLayout>
  );
};
