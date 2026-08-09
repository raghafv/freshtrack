import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthForm } from "@/components/auth-form";
import { BrandMark } from "@/components/landing/brand-mark";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to FreshTrack — Smart Pantry Tracker" },
      {
        name: "description",
        content:
          "Sign in to FreshTrack to track your groceries, expiry dates, shopping list and pantry health.",
      },
      { property: "og:title", content: "Sign in to FreshTrack" },
      {
        property: "og:description",
        content: "Track groceries, expiry dates and shopping lists with FreshTrack.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://fresh-track.in/auth" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sign in to FreshTrack" },
      {
        name: "twitter:description",
        content: "Track groceries, expiry dates and shopping lists with FreshTrack.",
      },
    ],
    links: [{ rel: "canonical", href: "https://fresh-track.in/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/home", replace: true });
  }, [loading, session, navigate]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-8 text-center">
          <BrandMark className="mx-auto mb-4 h-16 w-16" />
          <h1 className="text-3xl font-bold">Sign in to FreshTrack</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your smart pantry. Know what you own, use it before it spoils.
          </p>
        </div>

        <AuthForm idPrefix="page" />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Built for households that buy in bulk — track expiry, cut waste, save money.
        </p>
      </div>
    </main>
  );
}
