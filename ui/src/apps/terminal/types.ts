export const AGENT_TYPES = ["native", "claude", "codex", "gemini"] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

export const AGENT_LABELS: Record<AgentType, string> = {
  native: "Shell",
  claude: "Claude",
  codex: "Codex",
  gemini: "Gemini",
};

export interface CreateSessionPayload {
  workspaceId: string;
  agentType: AgentType;
  args?: string[];
}

export interface Session {
  id: string;
  workspaceId: string;
  agentType: AgentType;
  cwd: string;
}
