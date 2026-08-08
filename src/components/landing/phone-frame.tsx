import { Check, ChefHat, Home, Plus, Refrigerator, Sparkles } from "lucide-react";

/**
 * A CSS iPhone frame rendering a faithful, static replica of the real
 * FreshTrack home screen using the app's own design tokens.
 */
export function PhoneFrame() {
  return (
    <div className="relative mx-auto w-[268px] rounded-[3rem] border-[10px] border-foreground/90 bg-background shadow-2xl">
      <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-foreground/90" />
      <div className="h-[560px] overflow-hidden rounded-[2.3rem] bg-background px-5 pt-9">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Good evening,
        </p>
        <p className="text-[22px] font-bold leading-tight tracking-[-0.03em]">Raghav.</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          A few things would love to be used soon.
        </p>

        <div className="mt-5 rounded-[1.4rem] border border-border/60 bg-card p-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <div className="absolute inset-0 rounded-full border-[6px] border-secondary" />
              <div className="absolute inset-0 rotate-[135deg] rounded-full border-[6px] border-transparent border-l-primary border-t-primary" />
              <div className="flex h-full w-full items-center justify-center text-[15px] font-bold">
                82
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold">Fresh score</p>
              <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                24 items tracked · 3 expiring this week
              </p>
            </div>
          </div>
        </div>

        <p className="mt-5 text-[12.5px] font-semibold tracking-[-0.02em]">Needs attention</p>
        <div className="mt-2 flex gap-2.5">
          {[
            { name: "Spinach", when: "Expires today", tone: "bg-destructive" },
            { name: "Paneer", when: "2 days left", tone: "bg-warning" },
          ].map((i) => (
            <div key={i.name} className="w-1/2 rounded-[1.1rem] border border-border/60 bg-card p-3">
              <div className="mb-2 h-12 w-full rounded-xl bg-secondary" />
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${i.tone}`} />
                <span className="text-[9.5px] text-muted-foreground">{i.when}</span>
              </div>
              <p className="truncate text-[12px] font-semibold">{i.name}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-[12.5px] font-semibold tracking-[-0.02em]">Shopping list</p>
        <div className="mt-2 divide-y divide-border/50 rounded-[1.1rem] border border-border/60 bg-card">
          {[
            { name: "Milk", done: true },
            { name: "Tomatoes", done: false },
          ].map((s) => (
            <div key={s.name} className="flex items-center gap-2.5 px-3.5 py-2.5">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  s.done ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {s.done && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
              </span>
              <span
                className={`text-[11.5px] font-medium ${s.done ? "text-muted-foreground line-through" : ""}`}
              >
                {s.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-[10px] bottom-[10px] flex items-center gap-1 rounded-b-[2.3rem] border-t border-border/60 bg-card/95 px-4 py-2.5 backdrop-blur">
        {[Home, Refrigerator].map((Icon, i) => (
          <Icon
            key={i}
            className={`h-4 w-4 flex-1 ${i === 0 ? "text-primary" : "text-muted-foreground"}`}
            strokeWidth={1.9}
          />
        ))}
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Plus className="h-5 w-5" strokeWidth={3.2} />
        </span>
        {[Sparkles, ChefHat].map((Icon, i) => (
          <Icon key={i} className="h-4 w-4 flex-1 text-muted-foreground" strokeWidth={1.9} />
        ))}
      </div>
    </div>
  );
}
