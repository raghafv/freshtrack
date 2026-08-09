import logo from "@/assets/logo.png.asset.json";
import { cn } from "@/lib/utils";

/** The FreshTrack leaf mark. Always the same asset, everywhere. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt="FreshTrack logo"
      width={128}
      height={128}
      className={cn("h-6 w-6 rounded-full object-contain", className)}
    />
  );
}
