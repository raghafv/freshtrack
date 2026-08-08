import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Leaf, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Why FreshTrack", href: "#why" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const light = !scrolled && !menuOpen;

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed inset-x-0 top-0 z-[100] transition-all duration-500 ${
        menuOpen
          ? "bg-foreground"
          : scrolled
            ? "bg-card/90 shadow-sm backdrop-blur-xl"
            : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-12">
        <Link to="/" className="flex items-center gap-2">
          <Leaf className={`h-4 w-4 ${light ? "text-white" : "text-primary"}`} strokeWidth={2} />
          <span
            className={`text-sm font-semibold tracking-[-0.01em] ${light ? "text-white" : "text-foreground"}`}
          >
            FreshTrack
          </span>
        </Link>

        <div className="hidden items-center gap-10 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`text-[11px] uppercase tracking-[0.16em] transition-opacity hover:opacity-60 ${
                light ? "text-white" : "text-foreground"
              }`}
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/auth"
            className={`rounded-full border px-5 py-2 text-[11px] uppercase tracking-[0.16em] backdrop-blur-md transition-colors ${
              light
                ? "border-white/30 bg-white/10 text-white hover:bg-white hover:text-foreground"
                : "border-primary bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            Try FreshTrack
          </Link>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className={`md:hidden ${light ? "text-white" : "text-foreground"}`}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
            exit={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="bg-foreground px-6 pb-6 md:hidden"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block py-3 text-[11px] uppercase tracking-[0.16em] text-white/80"
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/auth"
              onClick={() => setMenuOpen(false)}
              className="mt-3 block rounded-full border border-white/30 bg-white/10 py-3 text-center text-[11px] uppercase tracking-[0.16em] text-white"
            >
              Try FreshTrack
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
