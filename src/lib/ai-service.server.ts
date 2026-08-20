/**
 * Centralised AI service.
 *
 * Every text AI feature in FreshTrack goes through `generateAIResponse()`.
 * Text generation uses Groq directly for low-latency assistant and recipe
 * responses. Image/OCR work uses the separate vision provider chain.
 *
 * Adding a provider = push one more entry into PROVIDERS below.
 */
import type { AiMessage, AiProviderLog, AiProviderName } from "./ai-types";

const REQUEST_TIMEOUT_MS = 45_000;
const CACHE_TTL_MS = 60_000;
const MAX_LOGS = 100;

export class AiUnavailableError extends Error {
  constructor() {
    super("AI is temporarily unavailable. Please try again in a few minutes.");
    this.name = "AiUnavailableError";
  }
}

interface ProviderDefinition {
  name: AiProviderName;
  /** OpenAI-compatible chat completions endpoint. */
  url: string;
  model: string;
  /** Returns null when the provider has no key configured -> skipped. */
  headers: () => Record<string, string> | null;
}

const PROVIDERS: ProviderDefinition[] = [
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "qwen/qwen3.6-27b",
    headers: () => {
      const key = process.env.GROQ_API_KEY;
      return key ? { Authorization: `Bearer ${key}` } : null;
    },
  },
];

/* ------------------------------------------------------------------ logs */

const logs: AiProviderLog[] = [];

function record(entry: AiProviderLog) {
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
  const tag = entry.ok ? "ok" : "fail";
  console.info(
    `[ai:${entry.feature}] ${entry.provider} attempt=${entry.attempt} ${tag} ${entry.ms}ms` +
      (entry.fallback ? " (fallback)" : "") +
      (entry.error ? ` — ${entry.error}` : ""),
  );
}

/** Debug-only view of recent provider activity. */
export function getProviderLogs(): AiProviderLog[] {
  return [...logs].reverse();
}

/* --------------------------------------------------------- cache + dedupe */

type CacheEntry = { at: number; value: Record<string, unknown> };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<Record<string, unknown>>>();

function cacheKey(feature: string, messages: AiMessage[]) {
  return `${feature}::${JSON.stringify(messages)}`;
}

/* ------------------------------------------------------------- transport */

function isTransient(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

async function callProvider(
  provider: ProviderDefinition,
  headers: Record<string, string>,
  messages: AiMessage[],
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        model: provider.model,
        response_format: { type: "json_object" },
        messages,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      const err = new Error(`${res.status} ${body}`);
      (err as Error & { transient?: boolean }).transient = isTransient(res.status);
      throw err;
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      return match ? (JSON.parse(match[0]) as Record<string, unknown>) : { reply: raw };
    }
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------- public */

/**
 * The single entry point for every text AI feature.
 * Always resolves to a parsed JSON object, or throws `AiUnavailableError`.
 */
export async function generateAIResponse(
  feature: string,
  messages: AiMessage[],
): Promise<Record<string, unknown>> {
  const key = cacheKey(feature, messages);

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const running = inFlight.get(key);
  if (running) return running;

  const task = (async () => {
    let usedFallback = false;

    for (const provider of PROVIDERS) {
      const headers = provider.headers();
      if (!headers) continue; // not configured -> skip silently

      // One bounded retry only for a transient Groq failure.
      const attempts = 2;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        const started = Date.now();
        try {
          const value = await callProvider(provider, headers, messages);
          record({
            at: new Date().toISOString(),
            feature,
            provider: provider.name,
            attempt,
            ms: Date.now() - started,
            ok: true,
            fallback: usedFallback,
          });
          cache.set(key, { at: Date.now(), value });
          return value;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const transient =
            (error as { transient?: boolean }).transient === true ||
            (error as { name?: string }).name === "AbortError" ||
            error instanceof TypeError;
          record({
            at: new Date().toISOString(),
            feature,
            provider: provider.name,
            attempt,
            ms: Date.now() - started,
            ok: false,
            error: message,
            fallback: usedFallback,
          });
          if (!transient) break;
          if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      usedFallback = true;
    }

    throw new AiUnavailableError();
  })();

  inFlight.set(key, task);
  try {
    return await task;
  } finally {
    inFlight.delete(key);
  }
}
