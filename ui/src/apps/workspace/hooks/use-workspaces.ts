import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  CreateWorkspacePayload,
  UpdateWorkspacePayload,
  Workspace,
} from "../types";

const WORKSPACES_KEY = ["workspaces"];

export function useWorkspaces() {
  return useQuery<Workspace[]>({
    queryKey: WORKSPACES_KEY,
    queryFn: async () => {
      const res = await fetch("/api/workspaces");
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      return res.json();
    },
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateWorkspacePayload) => {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create workspace");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY });
      toast.success("Workspace created");
    },
    onError: () => {
      toast.error("Failed to create workspace");
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: UpdateWorkspacePayload & { id: string }) => {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update workspace");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY });
      toast.success("Workspace updated");
    },
    onError: () => {
      toast.error("Failed to update workspace");
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete workspace");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY });
      toast.success("Workspace deleted");
    },
    onError: () => {
      toast.error("Failed to delete workspace");
    },
  });
}
