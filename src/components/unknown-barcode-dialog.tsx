import { useEffect, useState } from "react";
import { Loader2, ScanBarcode } from "lucide-react";
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

interface Props {
  open: boolean;
  barcode: string | null;
  imageUrl?: string | null;
  userId?: string | null;
  onOpenChange: (open: boolean) => void;
  onDone?: (info: { name: string; quantity: string; shelfLifeDays: number }) => void;
}

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setQuantity("");
      setYears("");
      setMonths("");
      setDays("");
    }
  }, [open, barcode]);

  const shelfLifeDays =
    (Number(years) || 0) * 365 + (Number(months) || 0) * 30 + (Number(days) || 0);
  const canSubmit = Boolean(name.trim()) && Number(days) > 0 && shelfLifeDays > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode || !canSubmit) return;
    setSaving(true);
    const result = await submitPendingProduct({
      barcode,
      name,
      quantity,
      imageUrl,
      userId,
      shelfLifeDays,
    });
    setSaving(false);

    if (result.status === "submitted") {
      toast.success("Thanks! Sent for review — it'll help every FreshTrack user.");
    } else if (result.status === "duplicate") {
      toast.info("This product is already awaiting approval.");
    } else {
      toast.error(result.message);
      return;
    }
    onOpenChange(false);
    onDone?.({ name: name.trim(), quantity: quantity.trim(), shelfLifeDays });
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
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
                  <p className="text-center text-[11px] text-muted-foreground">
                    {f.label}
                    {f.id === "dys" ? " *" : ""}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Years and months are optional — days is required. Read it off the pack&apos;s
              &quot;best before&quot; instead of letting us guess.
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
