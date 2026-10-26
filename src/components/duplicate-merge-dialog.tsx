import { Loader2, Merge, SeparatorHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { emojiFor } from "@/lib/emoji";
import { expiryText, formatQty } from "@/lib/freshtrack";
import type { PendingDuplicate } from "@/lib/smart-add";

interface Props {
  pending: PendingDuplicate | null;
  busy?: boolean;
  onMerge: () => void;
  onKeepSeparate: () => void;
  onCancel: () => void;
}

/** Asks whether a repeated product should merge into the existing pantry entry. */
export function DuplicateMergeDialog({ pending, busy, onMerge, onKeepSeparate, onCancel }: Props) {
  if (!pending) return null;
  const { match, payload } = pending;

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span aria-hidden>{emojiFor(match.existing.name, match.existing.category)}</span>
            You already have {match.existing.name}
          </DialogTitle>
          <DialogDescription>
            Merge the new stock into the existing entry, or keep them as two separate batches.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 text-sm">
          <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">In your pantry</p>
            <p className="font-semibold">
              {formatQty(Number(match.existing.quantity), match.existing.unit)} ·{" "}
              {match.existing.storage}
            </p>
            <p className="text-xs text-muted-foreground">
              {expiryText(match.existing.expiry_date)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Adding now</p>
            <p className="font-semibold">
              {formatQty(payload.quantity, payload.unit)} · {payload.storage}
            </p>
            <p className="text-xs text-muted-foreground">{expiryText(payload.expiry_date)}</p>
          </div>
          <div className="rounded-2xl bg-primary-soft px-4 py-3 text-primary">
            <p className="text-xs font-medium">After merging</p>
            <p className="font-semibold">{match.summary}</p>
            <p className="text-xs opacity-80">
              Expiry stays at the earliest date ({match.mergedExpiry}) so nothing spoils unnoticed.
            </p>
          </div>
          {!match.sameStorage && (
            <p className="rounded-2xl bg-warning/15 px-4 py-3 text-xs font-medium text-warning">
              The existing pack is in the {match.existing.storage} and this one is in the{" "}
              {payload.storage}. Keeping them separate is usually more accurate.
            </p>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" className="rounded-xl" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            className="rounded-xl"
            onClick={onKeepSeparate}
            disabled={busy}
          >
            <SeparatorHorizontal className="h-4 w-4" /> Keep separate
          </Button>
          <Button className="press rounded-xl" onClick={onMerge} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4" />}
            Merge quantities
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
