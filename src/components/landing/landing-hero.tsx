import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Leaf } from "lucide-react";
import { ImageSlot } from "@/components/landing/image-slot";
import { PhoneFrame } from "@/components/landing/phone-frame";

const SLIDES = [
  { name: "hero-kitchen.jpg", label: "Warm kitchen counter" },
  { name: "hero-fridge.jpg", label: "Open fridge, fresh produce" },
  { name: "hero-market.jpg", label: "Indian grocery haul" },
  { name: "hero-cooking.jpg", label: "Home cooking, evening light" },
];

const SLIDE_DURATION = 5000;

export function LandingHero() {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);

  const next = useCallback(() => {
    setCurrent((p) => (p + 1) % SLIDES.length);
    setProgress(0);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          next();
          return 0;
        }
        return p + 100 / (SLIDE_DURATION / 50);
      });
    }, 50);
    return () => clearInterval(id);
  }, [next]);

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <ImageSlot
            name={SLIDES[current].name}
            label={SLIDES[current].label}
            className="h-full w-full"
          />
          <div className="absolute inset-0 bg-foreground/55" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 pb-24 pt-32 lg:grid-cols-2 lg:px-12">
        <div className="text-white">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[10.5px] uppercase tracking-[0.18em] backdrop-blur-md"
          >
            <Leaf className="h-3.5 w-3.5" strokeWidth={2} />
            AI pantry assistant
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="max-w-xl text-4xl font-bold leading-[1.05] tracking-[-0.035em] md:text-5xl lg:text-6xl"
          >
            Your smart kitchen.
            <span className="block text-white/70">Zero waste. Always fresh.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="mt-6 max-w-md text-[15px] leading-relaxed text-white/80"
          >
            Scan your groceries once. FreshTrack tracks every expiry date, tells you what to cook
            first, and quietly keeps food out of the bin.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-white/90"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20"
            >
              See how it works
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
          className="hidden justify-center lg:flex"
        >
          <PhoneFrame />
        </motion.div>
      </div>

      <div className="absolute inset-x-6 bottom-8 z-10 flex gap-2 lg:inset-x-12">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.name}
            type="button"
            onClick={() => {
              setCurrent(i);
              setProgress(0);
            }}
            aria-label={`Show ${slide.label}`}
            className="h-[2px] flex-1 overflow-hidden bg-white/30"
          >
            <div
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ width: i === current ? `${progress}%` : i < current ? "100%" : "0%" }}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
