import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/landing/brand-mark";
import { PhoneFrame } from "@/components/landing/phone-frame";
import hero1 from "@/assets/hero1.jpg.asset.json";
import hero2 from "@/assets/hero2.png.asset.json";
import hero3 from "@/assets/hero3.jpg.asset.json";

const SLIDES = [
  { src: hero1.url, alt: "A spread of home-cooked dishes plated on wooden boards" },
  { src: hero2.url, alt: "An open fridge filled with fresh vegetables and juices" },
  { src: hero3.url, alt: "Chopping fresh broccoli on a wooden board" },
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
      {/* Cross-fade without mount/unmount so route changes never race the DOM. */}
      <div className="absolute inset-0">
        {SLIDES.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            loading={i === 0 ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
            style={{ opacity: i === current ? 1 : 0 }}
          />
        ))}
        <div className="absolute inset-0 bg-foreground/60" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 pb-24 pt-32 lg:grid-cols-2 lg:px-12">
        <div className="text-white">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[10.5px] uppercase tracking-[0.18em] backdrop-blur-md"
          >
            <BrandMark className="h-4 w-4" />
            AI cook for your pantry
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="max-w-xl text-4xl font-bold leading-[1.05] tracking-[-0.035em] md:text-5xl lg:text-6xl"
          >
            An AI chef that cooks
            <span className="block text-white/70">from what you already own.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="mt-6 max-w-md text-[15px] leading-relaxed text-white/80"
          >
            Scan your groceries once. FreshTrack writes a delicious, step-by-step recipe from your
            real pantry every day, tracks every expiry date, and quietly keeps food out of the bin.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <a
              href="#signin"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-white/90"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </a>
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
            key={slide.src}
            type="button"
            onClick={() => {
              setCurrent(i);
              setProgress(0);
            }}
            aria-label={`Show slide ${i + 1}`}
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
