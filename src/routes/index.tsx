import { createFileRoute } from "@tanstack/react-router";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingWhy } from "@/components/landing/landing-why";
import { LandingSignIn } from "@/components/landing/landing-signin";
import { LandingFooter } from "@/components/landing/landing-footer";
import socialImage from "@/assets/social_image.png.asset.json";

const TITLE = "FreshTrack — Smart Pantry & Expiry Tracker for Indian Kitchens";
const DESCRIPTION =
  "FreshTrack's AI cook writes a delicious recipe every day from the groceries you already own, while tracking every expiry date so nothing goes to waste.";
const SOCIAL_IMAGE = `https://fresh-track.in${socialImage.url}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://fresh-track.in/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { property: "og:image", content: SOCIAL_IMAGE },
      { name: "twitter:image", content: SOCIAL_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://fresh-track.in/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "FreshTrack",
          url: "https://fresh-track.in/",
          description: DESCRIPTION,
        }),
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
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
