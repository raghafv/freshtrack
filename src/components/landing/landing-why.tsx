import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, IndianRupee, Sparkles, Smartphone } from "lucide-react";

const POINTS = [
  {
    icon: IndianRupee,
    title: "Built for Indian kitchens",
    body: "Prices in rupees, Indian brands in the barcode database, and shelf-life estimates tuned to local staples.",
  },
  {
    icon: Sparkles,
    title: "AI that stays on topic",
    body: "The assistant only answers pantry, food and recipe questions — grounded in the items you actually own.",
  },
  {
    icon: Smartphone,
    title: "Installs like an app",
    body: "Add FreshTrack to your home screen and get push reminders before anything turns. No store download needed.",
  },
];

export function LandingWhy() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section id="why" ref={ref} className="bg-background py-28 lg:py-36">
      <div className="mx-auto max-w-6xl px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Why FreshTrack
          </span>
          <h2 className="text-3xl font-bold tracking-[-0.03em] md:text-4xl">
            A kitchen that keeps track of itself
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {POINTS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-[1.75rem] border border-border/60 bg-card p-7"
              >
                <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <h3 className="text-[16px] font-semibold tracking-[-0.02em]">{p.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{p.body}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 overflow-hidden rounded-[2.25rem] bg-foreground px-8 py-16 text-center text-background lg:px-16"
        >
          <h2 className="mx-auto max-w-lg text-3xl font-bold leading-tight tracking-[-0.03em] md:text-4xl">
            Stop throwing away food you forgot you had.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed text-background/70">
            Create your free FreshTrack account and add your first item in under a minute.
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-background px-7 py-3.5 text-sm font-semibold text-foreground transition-opacity hover:opacity-90"
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
