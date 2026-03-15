import { useParams } from "react-router";

import { AppLayout } from "@/apps/core/components/AppLayout";

export const TerminalPage = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <AppLayout>
      <p>Terminal: {id}</p>
    </AppLayout>
  );
};
