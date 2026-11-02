import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ImageSlot } from "@/components/landing/image-slot";

const STEPS = [
  {
    step: "01",
    title: "Scan what you bought",
    body: "Camera, barcode or a photo of the bill. FreshTrack reads the items, brands and dates for you.",
    image: { name: "step-scan.jpg", label: "Scanning the shopping" },
  },
  {
    step: "02",
    title: "Your pantry organises itself",
    body: "Everything lands in the right category and storage with a live expiry countdown attached.",
    image: { name: "step-organise.jpg", label: "Organised pantry shelves" },
  },
  {
    step: "03",
    title: "Cook first, waste never",
    body: "Each evening you get one recipe built from what needs using, plus a shopping list that writes itself.",
    image: { name: "step-cook.jpg", label: "Dinner plated at home" },
  },
];

export function LandingHowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section id="how-it-works" ref={ref} className="bg-secondary/40 py-28 lg:py-36">
      <div className="mx-auto max-w-6xl px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-20 text-center"
        >
          <span className="mb-4 block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            How it works
          </span>
          <h2 className="text-3xl font-bold tracking-[-0.03em] md:text-4xl">
            Three taps from chaos to calm
          </h2>
        </motion.div>

        <div className="space-y-16 lg:space-y-24">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[direction:rtl]" : ""}`}
            >
              <div className="lg:[direction:ltr]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                  Step {s.step}
                </span>
                <h3 className="mt-3 text-2xl font-bold tracking-[-0.03em] md:text-3xl">
                  {s.title}
                </h3>
                <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
              <div className="lg:[direction:ltr]">
                <ImageSlot
                  name={s.image.name}
                  label={s.image.label}
                  className="aspect-[4/3] w-full rounded-[2rem]"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
