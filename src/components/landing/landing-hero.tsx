import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BrandMark } from "@/components/landing/brand-mark";
import hero1 from "@/assets/hero1.jpg.asset.json";
import hero2 from "@/assets/hero2.png.asset.json";
import hero3 from "@/assets/hero3.jpg.asset.json";

const SLIDES = [
  {
    src: hero1.url,
    alt: "A spread of home-cooked dishes — steak, pasta and salmon — plated on wooden boards",
    headline: "Restaurant dinners,",
    accent: "from the groceries already in your kitchen.",
    copy: "FreshTrack's AI cook turns tonight's leftovers-in-waiting into a plated, step-by-step dinner you'd happily photograph.",
  },
  {
    src: hero2.url,
    alt: "An open fridge stocked with fresh vegetables, fruit and juices",
    headline: "Every shelf, tracked.",
    accent: "Nothing forgotten at the back.",
    copy: "Scan your groceries once and FreshTrack remembers every expiry date, so the fridge never hides another spoiled packet.",
  },
  {
    src: hero3.url,
    alt: "Hands chopping fresh broccoli on a wooden cutting board",
    headline: "Cook with what's fresh",
    accent: "before it ever goes to waste.",
    copy: "FreshTrack puts the ingredients closest to expiry at the top of tonight's recipe — good food saved, money saved.",
  },
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

  const slide = SLIDES[current]!;

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Cross-fade without mount/unmount so route changes never race the DOM. */}
      <div className="absolute inset-0">
        {SLIDES.map((s, i) => (
          <img
            key={s.src}
            src={s.src}
            alt={s.alt}
            loading={i === 0 ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
            style={{ opacity: i === current ? 1 : 0 }}
          />
        ))}
        <div className="absolute inset-0 bg-foreground/60" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 pb-28 pt-32 lg:px-12">
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

          <h1 className="max-w-2xl text-4xl font-bold leading-[1.05] tracking-[-0.035em] transition-opacity duration-500 md:text-5xl lg:text-6xl">
            {slide.headline}
            <span className="block text-white/70">{slide.accent}</span>
          </h1>

          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-white/80 transition-opacity duration-500">
            {slide.copy}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20"
            >
              See how it works
            </a>
          </div>
        </div>
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
