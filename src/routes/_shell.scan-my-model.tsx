import { createFileRoute } from "@tanstack/react-router";
import ScanWithModel from "@/components/ScanWithModel";

export const Route = createFileRoute("/_shell/scan-my-model")({
  component: ScanWithModel,
});
