import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Barcode, Camera, Check, Cpu, Loader2, Receipt, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader } from "@/components/layout";
import { ItemFormDialog, type ItemFormPrefill } from "@/components/item-form-dialog";
import { QuickAddDialog } from "@/components/quick-add-dialog";
import { ScanCamera } from "@/components/scan-camera";
import { ScanConfirmDialog } from "@/components/scan-confirm-dialog";
import { cn } from "@/lib/utils";
import { emojiFor } from "@/lib/emoji";
import { friendlyMessage } from "@/lib/errors";
import { learnProduct, lookupLearned } from "@/lib/custom-products";
import {
  lookupBarcode as lookupBarcodeDb,
  saveProduct,
  shelfDaysForCategory,
} from "@/lib/product-db";


import { useAuth } from "@/lib/auth";
import {
  useAddPantryItem,
  useRecordScan,
  useScanHistory,
  useSettings,
  uploadPantryImage,
} from "@/lib/data";
import { expiryText } from "@/lib/freshtrack";
import { findProduct, shelfDaysFrom } from "@/lib/grocery-catalog";
import type { StorageType } from "@/lib/freshtrack";
import {
  buildCandidate,
  candidateExpiry,
  predictShelfLife,
  candidateShelfDays,
  confidenceLabel,
  toDataUrl,
  type ScanCandidate,
} from "@/lib/scan";
import {
  detectGroceries,
  extractLabelDates,
  parseReceipt,
  type ReceiptLine,
} from "@/lib/vision.functions";

export const Route = createFileRoute("/_shell/scanner")({
  head: () => ({
    meta: [
      { title: "Scanner — AI Camera, Barcode & Receipt Scan | FreshTrack" },
      {
        name: "description",
        content:
          "Scan groceries with AI photo recognition, live barcode reading or receipt OCR, then confirm quantity, date and storage in seconds.",
      },
      { property: "og:title", content: "FreshTrack Scanner" },
      {
        property: "og:description",
        content: "AI photo recognition, live barcode scanning and receipt OCR for your pantry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScannerPage,
});

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

function ScannerPage() {
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const { data: scans = [] } = useScanHistory();
  const recordScan = useRecordScan();
  const addItem = useAddPantryItem();

  const [busy, setBusy] = useState<string | null>(null);
  const [detections, setDetections] = useState<ScanCandidate[]>([]);
  const [receiptLines, setReceiptLines] = useState<ReceiptLine[] | null>(null);
  const [receiptPicked, setReceiptPicked] = useState<Record<number, boolean>>({});
  const [importing, setImporting] = useState(false);

  const [confirming, setConfirming] = useState<ScanCandidate | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [prefill, setPrefill] = useState<ItemFormPrefill | undefined>();
  const [pendingMethod, setPendingMethod] = useState("camera");
  /** Barcode waiting to be contributed, set when a lookup came back empty. */
  const [learnBarcode, setLearnBarcode] = useState<string | null>(null);

  function openManual(reason?: string) {
    if (reason) toast.info(reason);
    setManualOpen(true);
  }


  /* ------------------------------- AI photo scan ------------------------------ */

  async function runPhotoScan(blob: Blob) {
    setBusy("Detecting groceries…");
    setDetections([]);
    try {
      const dataUrl = await toDataUrl(blob);
      const { items } = await detectGroceries({ data: { image: dataUrl } });
      if (items.length === 0) {
        openManual("Couldn't recognise anything — search the catalog instead.");
        return;
      }
      let imageUrl: string | null = null;
      if (user) {
        try {
          imageUrl = await uploadPantryImage(user.id, blob, "jpg");
        } catch {
          /* photo storage is best-effort */
        }
      }
      setDetections(
        items.map((it) =>
          buildCandidate({
            name: it.name,
            brand: it.brand,
            category: it.category,
            unit: it.unit,
            storage: it.storage,
            shelfLifeDays: it.shelfLifeDays,
            confidence: it.confidence,
            freshness: it.freshness,
            packaged: it.packaged,
            note: it.note,
            image_url: imageUrl,
            source: "camera",
          }),
        ),
      );
      setPendingMethod("camera");
      toast.success(`${items.length} item${items.length === 1 ? "" : "s"} detected`);
    } catch (e) {
      toast.error(friendlyMessage(e, "Scan failed"));
      openManual();
    } finally {
      setBusy(null);
    }
  }

  /* --------------------------------- barcode --------------------------------- */

  async function lookupBarcode(code: string, frame?: Blob) {
    setBusy("Looking up barcode…");
    try {
      const learned = lookupLearned(code, user?.id);
      if (learned) {
        setPendingMethod("barcode");
        setLearnBarcode(null);
        setConfirming(
          buildCandidate({
            name: learned.name,
            brand: learned.brand,
            category: learned.category,
            unit: learned.unit,
            storage: learned.storage,
            shelfLifeDays: learned.shelfLifeDays,
            packaged: true,
            source: "barcode",
          }),
        );
        toast.success(`${learned.name} — recognised from your saved products`);
        return;
      }

      // FreshTrack's own database first; Open Food Facts only when it misses.
      const { product, origin } = await lookupBarcodeDb(code, user?.id);
      if (!product) {
        setLearnBarcode(code);
        openManual("New barcode detected — add the product once and every user benefits.");
        return;
      }
      const known = findProduct(product.name);

      // Read any MFG / EXPIRY printed near the barcode from the same frame.
      let labelExpiry: string | null = null;
      let labelManufactured: string | null = null;
      if (frame) {
        setBusy("Reading label dates…");
        try {
          const dates = await extractLabelDates({ data: { image: await toDataUrl(frame) } });
          labelExpiry = dates.expiry;
          labelManufactured = dates.manufactured;
        } catch {
          /* dates are optional — fall back to estimated shelf life */
        }
      }

      setPendingMethod("barcode");
      setConfirming(
        buildCandidate({
          name: known?.name ?? product.name,
          brand: product.brand,
          category: known ? undefined : product.category,
          unit: known?.unit,
          storage: known?.storage ?? product.storage,
          shelfLifeDays: product.shelf_life_days,
          image_url: product.image_url,
          packageSize: product.size,
          packaged: true,
          source: "barcode",
          labelExpiry,
          labelManufactured,
        }),
      );
      toast.success(
        `${origin === "db" ? "Found in FreshTrack" : "Added to FreshTrack"}: ${product.name}${
          labelExpiry ? ` · expiry ${labelExpiry}` : " · expiry estimated"
        }`,
      );
    } catch (e) {
      setLearnBarcode(code);
      openManual(friendlyMessage(e, "Barcode lookup failed — add the product manually."));
    } finally {

      setBusy(null);
    }
  }

  /** Fallback when the live reader isn't available: decode a captured photo. */
  async function decodeBarcodeImage(blob: Blob) {
    const Ctor = (
      window as unknown as { BarcodeDetector?: new (o?: unknown) => BarcodeDetectorLike }
    ).BarcodeDetector;
    if (!Ctor) {
      openManual("This browser can't read barcodes — search manually.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(blob);
      const codes = await new Ctor().detect(bitmap);
      const value = codes[0]?.rawValue?.replace(/\D/g, "");
      if (value && value.length >= 6) {
        await lookupBarcode(value);
        return;
      }
    } catch {
      /* fall through */
    }
    openManual("No barcode found in that photo — search manually.");
  }

  /* --------------------------------- receipt --------------------------------- */

  async function runReceiptScan(blob: Blob) {
    setBusy("Reading receipt…");
    setReceiptLines(null);
    try {
      const dataUrl = await toDataUrl(blob);
      const { items } = await parseReceipt({ data: { image: dataUrl } });
      if (items.length === 0) {
        openManual("No products found on that receipt — add items manually.");
        return;
      }
      setReceiptLines(items);
      setReceiptPicked(Object.fromEntries(items.map((_, i) => [i, true])));
      toast.success(`${items.length} line item${items.length === 1 ? "" : "s"} found`);
    } catch (e) {
      toast.error(friendlyMessage(e, "Receipt scan failed"));
    } finally {
      setBusy(null);
    }
  }

  async function importReceipt() {
    if (!receiptLines) return;
    const chosen = receiptLines.filter((_, i) => receiptPicked[i]);
    if (chosen.length === 0) {
      toast.error("Select at least one item");
      return;
    }
    setImporting(true);
    try {
      for (const line of chosen) {
        const candidate = buildCandidate({
          name: line.name,
          unit: line.unit,
          quantity: line.quantity,
          source: "receipt",
        });
        const purchase = new Date().toISOString().slice(0, 10);
        await addItem.mutateAsync({
          name: candidate.name,
          brand: null,
          category: candidate.category,
          quantity: line.quantity,
          unit: candidate.unit,
          purchase_date: purchase,
          expiry_date: candidateExpiry(candidate, candidate.storage, purchase),
          storage: candidate.storage,
          image_url: null,
          source: "receipt",
          price: line.price,
        });
      }
      await recordScan.mutateAsync({ method: "receipt", items_added: chosen.length });
      toast.success(`${chosen.length} item${chosen.length === 1 ? "" : "s"} added to pantry`);
      setReceiptLines(null);
    } catch (e) {
      toast.error(friendlyMessage(e, "Import failed"));
    } finally {
      setImporting(false);
    }
  }

  /* ----------------------------------- ui ------------------------------------ */

  return (
    <PageContainer>
      <PageHeader
        title="Scanner"
        subtitle="Point, scan, confirm — AI recognition, barcodes and receipts in one place."
      />

      <Tabs defaultValue="camera">
        <TabsList className="grid w-full grid-cols-4 rounded-2xl">
          <TabsTrigger value="camera" className="rounded-xl text-xs sm:text-sm">
            <Camera className="mr-1 h-4 w-4" /> Scan
          </TabsTrigger>
          <TabsTrigger value="barcode" className="rounded-xl text-xs sm:text-sm">
            <Barcode className="mr-1 h-4 w-4" /> Barcode
          </TabsTrigger>
          <TabsTrigger value="receipt" className="rounded-xl text-xs sm:text-sm">
            <Receipt className="mr-1 h-4 w-4" /> Receipt
          </TabsTrigger>
          <TabsTrigger value="device" className="rounded-xl text-xs sm:text-sm">
            <Cpu className="mr-1 h-4 w-4" /> Device
          </TabsTrigger>
        </TabsList>

        {/* -------------------------------- AI scan ------------------------------- */}
        <TabsContent value="camera" className="mt-4">
          <ScanCamera
            mode="photo"
            busy={busy === "Detecting groceries…"}
            busyLabel="Detecting groceries…"
            hint="Point the camera at your groceries and capture — FreshTrack recognises the items, suggests storage and estimates shelf life."
            onCapture={runPhotoScan}
          />

          {detections.length > 0 && (
            <section className="mt-4 animate-fade-up">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-semibold">Detected items</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setDetections([])}
                >
                  Clear
                </Button>
              </div>
              <ul className="space-y-2">
                {detections.map((c) => {
                  const conf = c.confidence != null ? confidenceLabel(c.confidence) : null;
                  const prediction = predictShelfLife(
                    c,
                    c.storage,
                    new Date().toISOString().slice(0, 10),
                  );
                  return (
                    <li key={c.key}>
                      <button
                        type="button"
                        onClick={() => setConfirming(c)}
                        className="press surface-card flex w-full items-start justify-between gap-3 p-3 text-left"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            <span aria-hidden className="mr-1">
                              {emojiFor(c.name, c.category)}
                            </span>
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.category} · {c.storage} ·{" "}
                            <span className="font-medium text-foreground">
                              ~{prediction.days}d left
                            </span>{" "}
                            · {expiryText(prediction.expiry).toLowerCase()}
                          </p>
                          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                            {prediction.explanation}
                          </p>
                        </div>
                        {conf && (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              conf.tone === "high" && "bg-success/15 text-success",
                              conf.tone === "medium" && "bg-warning/15 text-warning",
                              conf.tone === "low" && "bg-destructive/15 text-destructive",
                            )}
                          >
                            <Sparkles className="mr-1 inline h-3 w-3" />
                            {conf.label}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Button
                variant="secondary"
                className="press mt-3 w-full rounded-2xl"
                onClick={() => openManual()}
              >
                <Search className="h-4 w-4" /> Something missing? Search manually
              </Button>
            </section>
          )}
        </TabsContent>

        {/* -------------------------------- barcode ------------------------------- */}
        <TabsContent value="barcode" className="mt-4">
          <ScanCamera
            mode="barcode"
            busy={busy === "Looking up barcode…" || busy === "Reading label dates…"}
            busyLabel={busy ?? "Looking up barcode…"}
            hint="Hold the barcode inside the frame — FreshTrack reads it automatically and fetches the product name, brand and pack size."
            onBarcode={lookupBarcode}
            onCapture={decodeBarcodeImage}
          />
          <p className="mt-3 rounded-2xl bg-primary-soft px-4 py-2.5 text-xs font-medium text-primary">
            When scanning a barcode also make sure to include the MFG / expiry date printed on the
            pack — if that isn&apos;t possible the AI will automatically estimate the expiry!
          </p>
          <Button
            variant="secondary"
            className="press mt-3 w-full rounded-2xl"
            onClick={() => openManual()}
          >
            <Search className="h-4 w-4" /> Search manually instead
          </Button>
        </TabsContent>

        {/* -------------------------------- receipt ------------------------------- */}
        <TabsContent value="receipt" className="mt-4">
          <ScanCamera
            mode="photo"
            busy={busy === "Reading receipt…"}
            busyLabel="Reading receipt…"
            captureLabel="Capture receipt"
            hint="Photograph your grocery bill — FreshTrack reads the line items so you can import them in one tap."
            onCapture={runReceiptScan}
          />

          {receiptLines && (
            <section className="mt-4 animate-fade-up">
              <h2 className="mb-2 text-base font-semibold">
                Detected products ({receiptLines.length})
              </h2>
              <ul className="space-y-2">
                {receiptLines.map((line, i) => (
                  <li
                    key={`${line.name}-${i}`}
                    className="surface-card flex items-center gap-3 p-3"
                  >
                    <Checkbox
                      id={`rl-${i}`}
                      checked={!!receiptPicked[i]}
                      onCheckedChange={(v) => setReceiptPicked((p) => ({ ...p, [i]: v === true }))}
                    />
                    <label htmlFor={`rl-${i}`} className="min-w-0 flex-1 cursor-pointer">
                      <p className="truncate text-sm font-medium">{line.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.quantity} {line.unit}
                        {line.price != null ? ` · ₹${line.price}` : ""}
                      </p>
                    </label>
                  </li>
                ))}
              </ul>
              <Button
                className="press mt-3 h-12 w-full rounded-2xl"
                onClick={importReceipt}
                disabled={importing}
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Import selected items
              </Button>
            </section>
          )}
        </TabsContent>

        {/* --------------------------------- device ------------------------------- */}
        <TabsContent value="device" className="mt-4">
          <div className="surface-card p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Cpu className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">FreshTrack fridge camera</p>
                <p className="text-xs text-muted-foreground">Not paired · phone camera active</p>
              </div>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              The magnetic AI camera writes into this exact same pantry. Simulate a device intake to
              see how items will arrive from the fridge.
            </p>
            <Button
              variant="secondary"
              className="press h-12 w-full rounded-2xl"
              onClick={() => {
                setPendingMethod("device");
                setPrefill({ source: "device", storage: "Fridge" });
                setFormOpen(true);
                toast.info("Simulating fridge device intake — confirm the item details.");
              }}
            >
              Simulate device intake
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold">Scan history</h2>
        {scans.length === 0 ? (
          <p className="surface-card p-4 text-sm text-muted-foreground">
            No scans yet. Every capture, barcode lookup and receipt import is logged here.
          </p>
        ) : (
          <ul className="space-y-2">
            {scans.map((s) => (
              <li key={s.id} className="surface-card flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium capitalize">{s.method} scan</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary">
                  +{s.items_added} item{s.items_added === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ScanConfirmDialog
        candidate={confirming}
        onOpenChange={(open) => !open && setConfirming(null)}
        onSaved={(c) => {
          setDetections((d) => d.filter((x) => x.key !== c.key));
          void recordScan.mutateAsync({ method: c.source || pendingMethod, items_added: 1 });
        }}
      />

      <UnknownBarcodeDialog
        open={Boolean(learnBarcode)}
        barcode={learnBarcode}
        userId={user?.id}
        onOpenChange={(open) => !open && setLearnBarcode(null)}
      />

      <QuickAddDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        defaultStorage={settings?.default_storage}
        defaultUnit={settings?.default_unit}
        onDetails={(p) => {
          setPrefill(p);
          setFormOpen(true);
        }}
      />


      <ItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        prefill={prefill}
        defaultStorage={settings?.default_storage}
        defaultUnit={settings?.default_unit}
        onSaved={() => {
          void recordScan.mutateAsync({ method: pendingMethod, items_added: 1 });
        }}
      />
    </PageContainer>
  );
}
