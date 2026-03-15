import { useState } from "react";
import { useNavigate } from "react-router";

export function useCreateSession() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const createSession = async (cwd: string, onSuccess?: () => void) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cwd: cwd || undefined }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = (await res.json()) as { id: string };
      onSuccess?.();
      navigate(`/terminals/${data.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { createSession, isSubmitting };
}
