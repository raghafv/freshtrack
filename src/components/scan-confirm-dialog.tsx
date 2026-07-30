import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MeasureInput } from "@/components/measure-input";
import { cn } from "@/lib/utils";
import { useAddPantryItem } from "@/lib/data";
import { STORAGE_TYPES, expiryText, toISODate } from "@/lib/freshtrack";
import {
  candidateExpiry,
  candidateShelfDays,
  candidateUnusualStorage,
  confidenceLabel,
  type ScanCandidate,
} from "@/lib/scan";

interface Props {
  candidate: ScanCandidate | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: (candidate: ScanCandidate) => void;
}

/** Final confirmation before a scanned item is saved: amount, date, storage. */
export function ScanConfirmDialog({ candidate, onOpenChange, onSaved }: Props) {
  const addItem = useAddPantryItem();
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [storage, setStorage] = useState("Pantry");
  const [purchaseDate, setPurchaseDate] = useState(toISODate(new Date()));

  useEffect(() => {
    if (!candidate) return;
    setQuantity(String(candidate.quantity || 1));
    setUnit(candidate.unit);
    setStorage(candidate.storage);
    setPurchaseDate(candidate.labelManufactured ?? toISODate(new Date()));
  }, [candidate]);

  if (!candidate) return null;

  const expiry = candidateExpiry(candidate, storage, purchaseDate);
  const unusual = candidateUnusualStorage(candidate, storage);
  const conf = candidate.confidence != null ? confidenceLabel(candidate.confidence) : null;

  async function save() {
    if (!candidate) return;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      await addItem.mutateAsync({
        name: candidate.name,
        brand: candidate.brand,
        category: candidate.category,
        quantity: qty,
        unit,
        purchase_date: purchaseDate,
        expiry_date: expiry,
        storage,
        image_url: candidate.image_url,
        source: candidate.source,
        price: null,
      });
      toast.success(`${candidate.name} added · ${expiryText(expiry).toLowerCase()}`);
      onSaved?.(candidate);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save item");
    }
  }

  return (
    <Dialog open={!!candidate} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {candidate.name}
            {conf && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  conf.tone === "high" && "bg-success/15 text-success",
                  conf.tone === "medium" && "bg-warning/15 text-warning",
                  conf.tone === "low" && "bg-destructive/15 text-destructive",
                )}
              >
                <Sparkles className="mr-1 inline h-3 w-3" />
                {conf.label}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {[candidate.brand, candidate.category, candidate.packageSize]
              .filter(Boolean)
              .join(" · ") || candidate.category}
            {" · "}
            {candidate.labelExpiry ? "expiry read from the label." : "expiry calculated automatically."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 overflow-y-auto py-1">
          {candidate.image_url && (
            <img
              src={candidate.image_url}
              alt={candidate.name}
              className="h-36 w-full rounded-2xl object-cover"
              loading="lazy"
            />
          )}

          <MeasureInput
            id="scan-qty"
            label="Quantity"
            form={candidate.form}
            value={quantity}
            unit={unit}
            onValueChange={setQuantity}
            onUnitChange={setUnit}
          />

          <div className="grid gap-2">
            <Label>Storage</Label>
            <div className="grid grid-cols-3 gap-2">
              {STORAGE_TYPES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStorage(s)}
                  className={cn(
                    "press rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors",
                    storage === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-card/60 hover:bg-accent/40",
                  )}
                >
                  {s}
                  <span className="block text-[10px] font-normal opacity-75">
                    {candidateShelfDays(candidate, s)} days
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="scan-purchase">Purchase date</Label>
            <Input
              id="scan-purchase"
              type="date"
              className="h-11"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {candidate.labelExpiry ? "Expiry printed on label" : "Expires on"}
            </p>
            <p className="text-base font-semibold">
              {expiry} <span className="text-muted-foreground">· {expiryText(expiry)}</span>
            </p>
          </div>

          {unusual && (
            <p className="rounded-2xl bg-warning/15 px-4 py-3 text-xs font-medium text-warning">
              {storage} isn&apos;t the usual place for {candidate.name.toLowerCase()}. We&apos;ve
              estimated a shorter shelf life — you can still save it.
            </p>
          )}
        </div>

        <div className="mt-2 flex justify-end">
          <Button className="press rounded-xl" onClick={save} disabled={addItem.isPending}>
            {addItem.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Add to pantry
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
