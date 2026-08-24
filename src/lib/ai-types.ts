/** Shared AI types. Type-only module — safe to import from anywhere. */

export type AiRole = "system" | "user" | "assistant";
export interface AiMessage {
  role: AiRole;
  content: string;
}

export type AiProviderName = "groq" | "groq-fallback" | "gateway";

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
  removed?: string[];
  checked?: string[];
  cleared?: boolean;
  pantryAdded?: string[];
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  inPantry: boolean;
}

export interface PantryRecipe {
  title: string;
  minutes: number;
  prepMinutes?: number;
  cookMinutes?: number;
  servings?: number;
  difficulty?: string;
  cuisine?: string;
  description?: string;
  ingredients?: RecipeIngredient[];
  equipment?: string[];
  uses: string[];
  priority: string[];
  steps: string[];
  tips?: string[];
  storageAdvice?: string | null;
  nutrition?: string | null;
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
