import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingWhy } from "@/components/landing/landing-why";
import { LandingSignIn } from "@/components/landing/landing-signin";
import { LandingFooter } from "@/components/landing/landing-footer";
import { useAuth } from "@/lib/auth";
import socialImage from "@/assets/social_image.png.asset.json";

const TITLE = "FreshTrack — AI Pantry Tracker & Recipe Cook for Indian Kitchens";
const DESCRIPTION =
  "FreshTrack tracks every grocery expiry date and its AI cook writes a fresh, step-by-step recipe each day from the food you already own — so nothing goes to waste.";
const SOCIAL_IMAGE = `https://fresh-track.in${socialImage.url}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:site_name", content: "FreshTrack" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://fresh-track.in/" },
      { property: "og:image", content: SOCIAL_IMAGE },
      { property: "og:image:alt", content: "FreshTrack — smart pantry and expiry tracker" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: SOCIAL_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://fresh-track.in/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": "https://fresh-track.in/#website",
              name: "FreshTrack",
              url: "https://fresh-track.in/",
              description: DESCRIPTION,
              inLanguage: "en-IN",
            },
            {
              "@type": "SoftwareApplication",
              name: "FreshTrack",
              applicationCategory: "LifestyleApplication",
              operatingSystem: "Web, Android, iOS",
              url: "https://fresh-track.in/",
              image: SOCIAL_IMAGE,
              description: DESCRIPTION,
              offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
            },
          ],
        }),
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  // Signed-in visitors belong in the app, never on the marketing page.
  useEffect(() => {
    if (!loading && session) navigate({ to: "/home", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingWhy />
        <LandingSignIn />
      </main>
      <LandingFooter />
    </div>
  );
}

