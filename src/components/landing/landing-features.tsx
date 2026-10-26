import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Barcode, Bell, CalendarClock, ChefHat, LineChart, ScanLine } from "lucide-react";
import { ImageSlot } from "@/components/landing/image-slot";

const FEATURES = [
  {
    icon: ScanLine,
    title: "AI food detection",
    description:
      "Point your camera at the counter and FreshTrack recognises each item, its category and how long it will last.",
    image: { name: "feature-camera-scan.jpg", label: "Camera scanning groceries" },
  },
  {
    icon: Barcode,
    title: "Barcode scanner",
    description:
      "Scan packaged goods against a self-learning global product database built around Indian brands.",
    image: { name: "feature-barcode.jpg", label: "Barcode scan on a packet" },
  },
  {
    icon: CalendarClock,
    title: "Expiry tracking",
    description:
      "Every item carries a live countdown, so you always know what to eat first and what can wait.",
    image: { name: "feature-expiry.jpg", label: "Fridge shelf with dates" },
  },
  {
    icon: ChefHat,
    title: "Recipes from your pantry",
    description:
      "Detailed, step-by-step recipes built only from ingredients you already own — nothing to buy.",
    image: { name: "feature-recipes.jpg", label: "Finished home-cooked dish" },
  },
  {
    icon: LineChart,
    title: "Pantry analytics",
    description:
      "See what you waste, what you overbuy and how much money your kitchen saves each month.",
    image: { name: "feature-analytics.jpg", label: "Pantry insights on phone" },
  },
  {
    icon: Bell,
    title: "Smart notifications",
    description:
      "Gentle push reminders before food turns — tuned exactly to the alerts you actually want.",
    image: { name: "feature-notifications.jpg", label: "Phone notification on counter" },
  },
];

export function LandingFeatures() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section id="features" ref={ref} className="bg-background py-28 lg:py-36">
      <div className="mx-auto max-w-6xl px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            What's inside
          </span>
          <h2 className="text-3xl font-bold tracking-[-0.03em] md:text-4xl">
            Everything your kitchen forgets
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed text-muted-foreground">
            One quiet app that remembers every date, every packet and every leftover.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.article
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                whileHover={{ y: -6 }}
                className="group overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-xl"
              >
                <ImageSlot name={f.image.name} label={f.image.label} className="h-44 w-full" />
                <div className="p-6">
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <h3 className="text-[16px] font-semibold tracking-[-0.02em]">{f.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
