import { useState } from "react";

import { useCreateSession } from "@/apps/terminal/hooks";
import type { AgentType } from "@/apps/terminal/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onCreated: (sessionId: string) => void;
}

const AGENT_OPTIONS: {
  value: AgentType;
  label: string;
  description: string;
}[] = [
  { value: "claude", label: "Claude Code", description: "Anthropic CLI agent" },
  { value: "codex", label: "Codex CLI", description: "OpenAI CLI agent" },
  { value: "gemini", label: "Gemini CLI", description: "Google CLI agent" },
  { value: "native", label: "Native Shell", description: "System shell" },
];

const ADVANCED_FLAGS: Partial<
  Record<AgentType, { label: string; flag: string }>
> = {
  claude: {
    label: "Dangerously skip permissions",
    flag: "--dangerously-skip-permissions",
  },
  codex: { label: "Full auto mode", flag: "--full-auto" },
  gemini: { label: "YOLO mode", flag: "-y" },
};

export function NewSessionDialog({
  open,
  onOpenChange,
  workspaceId,
  onCreated,
}: NewSessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <NewSessionForm
            key={workspaceId}
            workspaceId={workspaceId}
            onClose={() => onOpenChange(false)}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewSessionForm({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  onClose: () => void;
  onCreated: (sessionId: string) => void;
}) {
  const [agentType, setAgentType] = useState<AgentType>("claude");
  const [advancedFlag, setAdvancedFlag] = useState(false);
  const createSession = useCreateSession();

  const advancedOption = ADVANCED_FLAGS[agentType];

  const handleAgentChange = (value: string) => {
    setAgentType(value as AgentType);
    setAdvancedFlag(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createSession.isPending) return;

    const args: string[] = [];
    if (advancedFlag && advancedOption) {
      args.push(advancedOption.flag);
    }

    const session = await createSession.mutateAsync({
      workspaceId,
      agentType,
      args: args.length > 0 ? args : undefined,
    });

    onCreated(session.id);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>New Session</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <RadioGroup value={agentType} onValueChange={handleAgentChange}>
          {AGENT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="border-input has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent flex cursor-pointer items-center gap-3 rounded-md border p-3"
            >
              <RadioGroupItem
                value={option.value}
                id={`agent-${option.value}`}
              />
              <div className="grid gap-0.5">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-muted-foreground text-xs">
                  {option.description}
                </span>
              </div>
            </label>
          ))}
        </RadioGroup>

        {advancedOption && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="advanced-flag"
              checked={advancedFlag}
              onCheckedChange={(checked) => setAdvancedFlag(checked === true)}
            />
            <Label htmlFor="advanced-flag" className="text-sm font-normal">
              {advancedOption.label}
            </Label>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={createSession.isPending}>
          {createSession.isPending ? "Creating..." : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
