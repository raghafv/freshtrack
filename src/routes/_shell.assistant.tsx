import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, PageHeader } from "@/components/layout";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useAssistantMessages, useClearAssistant, type AssistantMessage } from "@/lib/data";
import { askAssistant } from "@/lib/ai.functions";

export const Route = createFileRoute("/_shell/assistant")({
  head: () => ({
    meta: [
      { title: "Ask FreshTrack — Your AI Pantry Assistant" },
      {
        name: "description",
        content:
          "Ask FreshTrack anything about your kitchen: what expires this week, what to cook tonight, or build a shopping list from your real pantry.",
      },
      { property: "og:title", content: "Ask FreshTrack" },
      {
        property: "og:description",
        content: "Natural-language answers grounded in the groceries you actually own.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssistantPage,
});

const SUGGESTIONS = [
  "Do I have milk?",
  "Which items expire this week?",
  "What should I finish today?",
  "Suggest recipes using expiring ingredients",
  "Generate my shopping list",
];

function AssistantPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: messages = [], isLoading } = useAssistantMessages();
  const clear = useClearAssistant();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const ask = useMutation({
    mutationFn: (question: string) => askAssistant({ data: { question } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["assistant", user?.id] });
      if (res.added.length > 0) {
        qc.invalidateQueries({ queryKey: ["shopping", user?.id] });
        toast.success(`Added to shopping list: ${res.added.join(", ")}`);
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "The assistant failed"),
    onSettled: () => {
      setPending(null);
      inputRef.current?.focus();
    },
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  function send(question: string) {
    const q = question.trim();
    if (!q || ask.isPending) return;
    setInput("");
    setPending(q);
    ask.mutate(q);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Ask FreshTrack"
        subtitle="Real answers from the groceries you actually own."
        action={
          messages.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-muted-foreground"
              onClick={() => clear.mutate()}
              disabled={clear.isPending}
            >
              <Trash2 className="h-4 w-4" /> Clear
            </Button>
          ) : undefined
        }
      />

      <section className="space-y-3">
        {isLoading ? (
          <p className="surface-card p-4 text-sm text-muted-foreground">Loading your chat…</p>
        ) : messages.length === 0 && !pending ? (
          <div className="surface-card p-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Your pantry assistant</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              I can see every item in your pantry, its storage and how many days it has left. Ask me
              anything — or start with one of these.
            </p>
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        )}

        {pending && (
          <Bubble
            message={{
              id: "pending-user",
              role: "user",
              content: pending,
              created_at: new Date().toISOString(),
            }}
          />
        )}

        {ask.isPending && (
          <div className="surface-card inline-flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Checking your pantry…
          </div>
        )}
        <div ref={endRef} />
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            disabled={ask.isPending}
            className="press rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Ask about your pantry…"
          className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl"
        />
        <Button
          type="submit"
          size="icon"
          className="press h-12 w-12 shrink-0 rounded-2xl"
          disabled={ask.isPending || input.trim().length === 0}
          aria-label="Send"
        >
          {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </PageContainer>
  );
}

function Bubble({ message }: { message: AssistantMessage }) {
  const mine = message.role === "user";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "animate-fade-up max-w-[88%] rounded-3xl px-4 py-3 text-sm",
          mine
            ? "bg-primary text-primary-foreground rounded-br-lg"
            : "surface-card rounded-bl-lg",
        )}
      >
        {mine ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="space-y-2 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_table]:w-full [&_td]:py-0.5 [&_td]:pr-3 [&_th]:py-0.5 [&_th]:pr-3 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
