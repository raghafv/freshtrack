import { cn } from "@/lib/utils";
import { emojiFor } from "@/lib/emoji";
import { foodPhoto } from "@/lib/food-image";

/**
 * Thumbnail for a pantry/shopping item.
 * Shows a real product photo only when we are confident it matches the item
 * (a scanned product image, or a specific name match). Otherwise it falls back
 * to an emoji tile instead of a misleading stock photo.
 */
export function FoodThumb({
  name,
  category,
  imageUrl,
  className,
  emojiClassName,
}: {
  name?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  className?: string;
  emojiClassName?: string;
}) {
  const photo = foodPhoto(name, category, imageUrl);

  if (photo) {
    return (
      <img
        src={photo}
        alt={name ?? "Item"}
        loading="lazy"
        width={512}
        height={512}
        className={cn("shrink-0 rounded-2xl bg-muted object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-muted",
        className,
      )}
    >
      <span className={cn("text-2xl leading-none", emojiClassName)}>
        {emojiFor(name ?? "", category ?? undefined)}
      </span>
    </span>
  );
}
