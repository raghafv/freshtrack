import { cn } from "@/lib/utils";
import hero1 from "@/assets/hero1.jpg.asset.json";
import hero2 from "@/assets/hero2.png.asset.json";
import hero3 from "@/assets/hero3.jpg.asset.json";

const PHOTOS = [hero2.url, hero3.url, hero1.url];

/**
 * Landing photography. Each slot picks one of the FreshTrack photos
 * deterministically from its name so the page stays stable between renders.
 */
export function ImageSlot({
  name,
  label,
  className,
}: {
  name: string;
  label: string;
  className?: string;
}) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const src = PHOTOS[hash % PHOTOS.length];

  return (
    <img
      src={src}
      alt={label}
      loading="lazy"
      className={cn("overflow-hidden bg-secondary object-cover", className)}
    />
  );
}
