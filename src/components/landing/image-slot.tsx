import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Placeholder for landing photography. Real images drop in later — each slot
 * keeps its aspect ratio and is tagged with `data-image-slot` so the correct
 * file can be swapped in without touching layout.
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
  return (
    <div
      data-image-slot={name}
      role="img"
      aria-label={`Placeholder for ${label}`}
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-secondary",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-foreground/20" />
      <div className="relative flex flex-col items-center gap-2 px-6 text-center">
        <ImageIcon className="h-6 w-6 text-foreground/40" strokeWidth={1.5} />
        <span className="text-[11px] uppercase tracking-[0.18em] text-foreground/50">{label}</span>
        <span className="text-[10px] tracking-wide text-foreground/30">{name}</span>
      </div>
    </div>
  );
}
