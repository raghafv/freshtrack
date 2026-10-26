import { createFileRoute } from "@tanstack/react-router";
import ScanWithModel from "@/components/ScanWithModel";

export const Route = createFileRoute("/scan-my-model")({
  component: ScanWithModel,
  head: () => ({
    meta: [
      { title: "FreshTrack Produce Freshness Model — CBSE Class 12 Capstone" },
      {
        name: "description",
        content:
          "Explore our custom-trained produce freshness classifier, built by our team for a CBSE Class 12 FreshTrack capstone project, with training curves and a 28-class confusion matrix.",
      },
      { property: "og:title", content: "FreshTrack Produce Freshness Model — CBSE Class 12 Capstone" },
      {
        property: "og:description",
        content:
          "A CBSE Class 12 team capstone showcase: try our browser-based produce freshness model and explore its training and evaluation charts.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://fresh-track.in/scan-my-model" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://fresh-track.in/scan-my-model" }],
  }),
});
