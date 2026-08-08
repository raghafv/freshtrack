import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { submitPendingProduct } from "@/lib/pending-products";
import { uploadPantryImage } from "@/lib/data";
import { friendlyMessage } from "@/lib/errors";

interface Props {
  open: boolean;
  barcode: string | null;
  imageUrl?: string | null;
  userId?: string | null;
  onOpenChange: (open: boolean) => void;
  onDone?: (info: {
    name: string;
    quantity: string;
    shelfLifeDays: number;
    imageUrl: string | null;
  }) => void;
}

type Shot = { file: File; preview: string } | null;

/** Shown when a scanned barcode isn't in the global database yet. */
export function UnknownBarcodeDialog({
  open,
  barcode,
  imageUrl,
  userId,
  onOpenChange,
  onDone,
}: Props) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [years, setYears] = useState("");
  const [months, setMonths] = useState("");
  const [days, setDays] = useState("");
  const [front, setFront] = useState<Shot>(null);
  const [back, setBack] = useState<Shot>(null);
  const [saving, setSaving] = useState(false);

  const frontInput = useRef<HTMLInputElement>(null);
  const backInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setQuantity("");
      setYears("");
      setMonths("");
      setDays("");
      setFront(null);
      setBack(null);
    }
  }, [open, barcode]);

  const shelfLifeDays =
    (Number(years) || 0) * 365 + (Number(months) || 0) * 30 + (Number(days) || 0);
  const canSubmit = Boolean(name.trim()) && shelfLifeDays > 0 && Boolean(front) && Boolean(back);

  function capture(side: "front" | "back", file?: File | null) {
    if (!file) return;
    const shot = { file, preview: URL.createObjectURL(file) };
    if (side === "front") setFront(shot);
    else setBack(shot);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode || !canSubmit || !front || !back) return;
    setSaving(true);
    try {
      let frontUrl: string | null = imageUrl ?? null;
      let backUrl: string | null = null;
      if (userId) {
        frontUrl = await uploadPantryImage(userId, front.file);
        backUrl = await uploadPantryImage(userId, back.file);
      }

      const result = await submitPendingProduct({
        barcode,
        name,
        quantity,
        imageUrl: frontUrl,
        backImageUrl: backUrl,
        userId,
        shelfLifeDays,
      });

      if (result.status === "submitted") {
        toast.success("Thanks! Sent for review — it'll help every FreshTrack user.");
      } else if (result.status === "duplicate") {
        toast.info("This product is already awaiting approval.");
      } else {
        toast.error(result.message);
        return;
      }
      onOpenChange(false);
      onDone?.({
        name: name.trim(),
        quantity: quantity.trim(),
        shelfLifeDays,
        imageUrl: frontUrl,
      });
    } catch (err) {
      toast.error(friendlyMessage(err, "Could not upload the product photos"));
    } finally {
      setSaving(false);
    }
  }

  function PhotoSlot({
    side,
    shot,
    inputRef,
    label,
    hint,
  }: {
    side: "front" | "back";
    shot: Shot;
    inputRef: React.RefObject<HTMLInputElement | null>;
    label: string;
    hint: string;
  }) {
    return (
      <div className="space-y-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => capture(side, e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="press relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40"
        >
          {shot ? (
            <>
              <img src={shot.preview} alt={`${label} of the product`} className="h-full w-full object-cover" />
              <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 text-[10px] font-medium">
                <RefreshCw className="h-3 w-3" /> Retake
              </span>
            </>
          ) : (
            <span className="flex flex-col items-center gap-1 text-muted-foreground">
              <Camera className="h-5 w-5" strokeWidth={1.8} />
              <span className="text-[11px] font-medium">{label}</span>
            </span>
          )}
        </button>
        <p className="text-center text-[10.5px] text-muted-foreground">{hint}</p>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-sm overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ScanBarcode className="h-5 w-5 text-primary" /> New barcode detected!
          </DialogTitle>
          <DialogDescription>
            Help improve FreshTrack by adding this product. Your contribution can help every
            FreshTrack user.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {barcode ? (
            <p className="rounded-2xl bg-muted/50 px-3 py-2 text-center font-mono text-xs text-muted-foreground">
              {barcode}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="pending-name">Product name as on the label</Label>
            <Input
              id="pending-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Amul Gold Full Cream Milk"
              autoFocus
              required
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pending-qty">Quantity / size exactly as written</Label>
            <Input
              id="pending-qty"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="500 ml"
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Product photos (both required)</Label>
            <div className="grid grid-cols-2 gap-3">
              <PhotoSlot
                side="front"
                shot={front}
                inputRef={frontInput}
                label="Front"
                hint="Used as the pantry thumbnail"
              />
              <PhotoSlot
                side="back"
                shot={back}
                inputRef={backInput}
                label="Back"
                hint="Barcode, dates and details"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Time to expire (from the pack)</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "yrs", label: "Years", value: years, set: setYears, max: 20 },
                { id: "mos", label: "Months", value: months, set: setMonths, max: 11 },
                { id: "dys", label: "Days", value: days, set: setDays, max: 365 },
              ].map((f) => (
                <div key={f.id} className="space-y-1">
                  <Input
                    id={`pending-${f.id}`}
                    inputMode="numeric"
                    type="number"
                    min={0}
                    max={f.max}
                    value={f.value}
                    onChange={(e) => f.set(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    className="rounded-2xl text-center"
                  />
                  <p className="text-center text-[11px] text-muted-foreground">{f.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Fill any of years, months or days — read it off the pack&apos;s &quot;best
              before&quot; instead of letting us guess.
            </p>
          </div>

          <Button type="submit" className="w-full rounded-2xl" disabled={saving || !canSubmit}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit for review
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
