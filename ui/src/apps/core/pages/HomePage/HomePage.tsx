import { AppLayout } from "@/apps/core/components/AppLayout/AppLayout.tsx";
import { Terminal } from "@/apps/terminal/components/Terminal";

export const HomePage = () => {
  return (
    <AppLayout className="flex flex-1 overflow-hidden">
      <Terminal />
    </AppLayout>
  );
};
