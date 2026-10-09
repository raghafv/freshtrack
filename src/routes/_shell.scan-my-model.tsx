import { createFileRoute } from "@tanstack/react-router";
import ScanWithModel from "@/components/ScanWithModel";

export const Route = createFileRoute("/_shell/scan-my-model")({
  component: ScanWithModel,
  head: () => ({
    meta: [
      { title: "My Self-Trained Freshness Model — FreshTrack Capstone" },
      {
        name: "description",
        content:
          "Explore and try the custom-trained produce freshness classifier I built for my FreshTrack capstone project, including its training curves and 28-class confusion matrix.",
      },
      { property: "og:title", content: "My Self-Trained Freshness Model — FreshTrack Capstone" },
      {
        property: "og:description",
        content:
          "A capstone project showcase: try my browser-based produce freshness model and explore its training and evaluation charts.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://fresh-track.in/scan-my-model" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://fresh-track.in/scan-my-model" }],
  }),
});
