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
  onDone?: (info: { name: string; quantity: string }) => void;
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setQuantity("");
    }
  }, [open, barcode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode || !name.trim()) return;
    setSaving(true);
    const result = await submitPendingProduct({
      barcode,
      name,
      quantity,
      imageUrl,
      userId,
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
    onDone?.({ name: name.trim(), quantity: quantity.trim() });
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

          <Button type="submit" className="w-full rounded-2xl" disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit for review
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
