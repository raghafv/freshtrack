import { useEffect, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddPantryItem, useUpdatePantryItem, uploadPantryImage } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import {
  CATEGORIES,
  STORAGE_TYPES,
  UNITS,
  estimateExpiry,
  guessCategory,
  suggestedStorage,
  toISODate,
  type PantryItem,
} from "@/lib/freshtrack";

export interface ItemFormPrefill {
  name?: string;
  brand?: string;
  category?: string;
  storage?: string;
  unit?: string;
  quantity?: number;
  image_url?: string | null;
  source?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: PantryItem | null;
  prefill?: ItemFormPrefill;
  defaultStorage?: string;
  defaultUnit?: string;
  onSaved?: () => void;
}

export function ItemFormDialog({
  open,
  onOpenChange,
  item,
  prefill,
  defaultStorage = "Fridge",
  defaultUnit = "pcs",
  onSaved,
}: Props) {
  const { user } = useAuth();
  const addItem = useAddPantryItem();
  const updateItem = useUpdatePantryItem();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<string>("Other");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<string>(defaultUnit);
  const [storage, setStorage] = useState<string>(defaultStorage);
  const [purchaseDate, setPurchaseDate] = useState(toISODate(new Date()));
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryTouched, setExpiryTouched] = useState(false);
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setName(item.name);
      setBrand(item.brand ?? "");
      setCategory(item.category);
      setQuantity(String(item.quantity));
      setUnit(item.unit);
      setStorage(item.storage);
      setPurchaseDate(item.purchase_date);
      setExpiryDate(item.expiry_date);
      setPrice(item.price != null ? String(item.price) : "");
      setImageUrl(item.image_url);
      setExpiryTouched(true);
    } else {
      const today = toISODate(new Date());
      const cat = prefill?.category ?? (prefill?.name ? guessCategory(prefill.name) : "Other");
      const store = prefill?.storage ?? suggestedStorage(cat) ?? defaultStorage;
      setName(prefill?.name ?? "");
      setBrand(prefill?.brand ?? "");
      setCategory(cat);
      setQuantity(String(prefill?.quantity ?? 1));
      setUnit(prefill?.unit ?? defaultUnit);
      setStorage(store);
      setPurchaseDate(today);
      setExpiryDate(estimateExpiry(cat, store, today));
      setPrice("");
      setImageUrl(prefill?.image_url ?? null);
      setExpiryTouched(false);
    }
  }, [open, item, prefill, defaultStorage, defaultUnit]);

  const product = findProduct(name);
  const unusualStorage = product ? isUnusualStorage(product, storage) : false;

  // Auto-calculate expiry until the user overrides it manually.
  useEffect(() => {
    if (!open || expiryTouched) return;
    const known = findProduct(name);
    setExpiryDate(
      known
        ? expiryForProduct(known, storage, purchaseDate)
        : estimateExpiry(category, storage, purchaseDate),
    );
  }, [open, expiryTouched, name, category, storage, purchaseDate]);

  function onNameBlur() {
    if (!item && name && category === "Other") {
      const guessed = guessCategory(name);
      if (guessed !== "Other") {
        setCategory(guessed);
        setStorage(suggestedStorage(guessed));
      }
    }
  }

  async function handleImage(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const url = await uploadPantryImage(user.id, file, ext);
      setImageUrl(url);
      toast.success("Photo attached");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Item name is required");
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    const payload = {
      name: name.trim().slice(0, 80),
      brand: brand.trim().slice(0, 60) || null,
      category,
      quantity: qty,
      unit,
      purchase_date: purchaseDate,
      expiry_date: expiryDate || estimateExpiry(category, storage, purchaseDate),
      storage,
      image_url: imageUrl,
      source: item?.source ?? prefill?.source ?? "manual",
      price: price ? Number(price) : null,
    };

    try {
      if (item) {
        await updateItem.mutateAsync({ id: item.id, patch: payload });
        toast.success("Item updated");
      } else {
        await addItem.mutateAsync(payload);
        toast.success(`${payload.name} added to pantry`);
      }
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save item");
    }
  }

  const busy = addItem.isPending || updateItem.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "Add to pantry"}</DialogTitle>
          <DialogDescription>
            Expiry is calculated automatically from category and storage — adjust it any time.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ft-name">Item</Label>
            <Input
              id="ft-name"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              onBlur={onNameBlur}
              placeholder="e.g. Whole milk"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ft-brand">Brand</Label>
              <Input
                id="ft-brand"
                value={brand}
                maxLength={60}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ft-qty">Quantity</Label>
              <Input
                id="ft-qty"
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Storage</Label>
              <Select value={storage} onValueChange={setStorage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ft-purchase">Purchase date</Label>
              <Input
                id="ft-purchase"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ft-expiry">Expiry date</Label>
              <Input
                id="ft-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => {
                  setExpiryTouched(true);
                  setExpiryDate(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 items-end gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ft-price">Value (optional)</Label>
              <Input
                id="ft-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ft-photo">Photo</Label>
              <input
                id="ft-photo"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImage(f);
                }}
              />
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl"
                disabled={uploading}
                onClick={() => document.getElementById("ft-photo")?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                {imageUrl ? "Replace photo" : "Add photo"}
              </Button>
            </div>
          </div>

          {imageUrl && (
            <img
              src={imageUrl}
              alt={name || "Pantry item"}
              className="h-36 w-full rounded-2xl object-cover"
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy} className="rounded-xl">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {item ? "Save changes" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
