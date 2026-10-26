import { AuthForm } from "@/components/auth-form";
import { BrandMark } from "@/components/landing/brand-mark";

/** Sign-in lives on the landing page itself — no separate login screen. */
export function LandingSignIn() {
  return (
    <section id="signin" className="scroll-mt-20 bg-secondary/60 py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:px-12">
        <div>
          <BrandMark className="mb-5 h-12 w-12" />
          <h2 className="max-w-md text-3xl font-bold leading-tight tracking-[-0.03em] md:text-4xl">
            Try FreshTrack free.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Create an account and your AI cook starts working with whatever is already in your
            kitchen — one beautifully detailed recipe a day, plus expiry tracking that actually
            saves money.
          </p>
        </div>

        <div className="w-full max-w-md justify-self-center lg:justify-self-end">
          <AuthForm idPrefix="landing" />
        </div>
      </div>
    </section>
  );
}
