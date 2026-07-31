/** Shared AI types. Type-only module — safe to import from anywhere. */

export type AiRole = "system" | "user" | "assistant";
export interface AiMessage {
  role: AiRole;
  content: string;
}

export type AiProviderName = "gemini" | "groq" | "lovable";

export interface AiProviderLog {
  at: string;
  feature: string;
  provider: AiProviderName;
  attempt: number;
  ms: number;
  ok: boolean;
  error?: string;
  fallback: boolean;
  cached?: boolean;
}

export interface AssistantReply {
  reply: string;
  added: string[];
}

export interface PantryRecipe {
  title: string;
  minutes: number;
  uses: string[];
  priority: string[];
  steps: string[];
  substitutions: { missing: string; use: string }[];
  savesWaste: string | null;
  note: string | null;
}

export interface ShoppingSuggestion {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  reason: string;
}
