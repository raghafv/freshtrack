import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Barcode, Camera, Check, Cpu, Loader2, Receipt, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout";
import { ItemFormDialog, type ItemFormPrefill } from "@/components/item-form-dialog";
import { QuickAddDialog } from "@/components/quick-add-dialog";
import { ScanCamera } from "@/components/scan-camera";
import { ScanConfirmDialog } from "@/components/scan-confirm-dialog";
import { UnknownBarcodeDialog } from "@/components/unknown-barcode-dialog";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { friendlyMessage } from "@/lib/errors";
import { learnProduct, lookupLearned } from "@/lib/custom-products";
import { findMyPendingProduct } from "@/lib/pending-products";
import { categoryForName, shelfDaysForCategory, storageForCategory } from "@/lib/product-meta";
import { lookupBarcode as lookupBarcodeDb } from "@/lib/product-db";

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

function splitReceiptLine(line: string) {
  const trimmed = line.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(.*?)(?:\s+)(\d{1,4}(?:\.\d{1,2})?)$/);
  if (!match) return { name: trimmed, price: null };
  const name = match[1].trim();
  if (!name) return null;
  const price = Number(match[2]);
  return { name, price: Number.isFinite(price) ? price : null };
}

async function localReceiptOcr(blob: Blob): Promise<ReceiptLine[]> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(blob);
    return String(result.data.text ?? "")
      .split(/\n+/)
      .map((line) => splitReceiptLine(line))
      .filter((line): line is { name: string; price: number | null } => line !== null)
      .map((line) => ({ name: line.name, quantity: 1, unit: "pcs", price: line.price }))
      .slice(0, 40);
  } finally {
    await worker.terminate();
  }
}

export const Route = createFileRoute("/_shell/scanner")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab:
      search.tab === "barcode" || search.tab === "receipt" || search.tab === "device"
        ? (search.tab as "barcode" | "receipt" | "device")
        : ("camera" as const),
  }),
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
  /** Index of the receipt line currently being edited in the confirm dialog. */
  const [receiptEditIndex, setReceiptEditIndex] = useState<number | null>(null);

  const [confirming, setConfirming] = useState<ScanCandidate | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [prefill, setPrefill] = useState<ItemFormPrefill | undefined>();
  const [pendingMethod, setPendingMethod] = useState("camera");
  /** Barcode waiting to be contributed, set when a lookup came back empty. */
  const [learnBarcode, setLearnBarcode] = useState<string | null>(null);
  /** Shown instead of jumping straight into manual search when nothing was found. */
  const [noItemsOpen, setNoItemsOpen] = useState(false);
  const [addingAll, setAddingAll] = useState(false);

  /** Remembers a barcode locally so the user is never asked to describe it twice. */
  function rememberBarcode(
    code: string,
    name: string,
    quantity?: string | null,
    shelfLifeDays?: number | null,
  ) {
    const category = categoryForName(name);
    learnProduct(
      {
        barcode: code.replace(/\D/g, ""),
        name,
        brand: null,
        category,
        unit: settings?.default_unit ?? "pcs",
        storage: storageForCategory(category, name) as StorageType,
        shelfLifeDays:
          shelfLifeDays && shelfLifeDays > 0
            ? Math.round(shelfLifeDays)
            : shelfDaysForCategory(category, name),
        savedAt: new Date().toISOString(),
      },
      user?.id,
    );
    void quantity;
  }


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
        setNoItemsOpen(true);
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
        // Already described by this user and waiting on approval — don't ask again.
        const pending = await findMyPendingProduct(code, user?.id);
        if (pending) {
          rememberBarcode(code, pending.name, pending.quantity, pending.shelfLifeDays);
          setPendingMethod("barcode");
          setConfirming(
            buildCandidate({
              name: pending.name,
              packageSize: pending.quantity,
              packaged: true,
              source: "barcode",
              shelfLifeDays: pending.shelfLifeDays ?? undefined,
              exactShelf: Boolean(pending.shelfLifeDays),
            }),
          );

          toast.success(`${pending.name} — saved from your earlier scan`);
          return;
        }
        setLearnBarcode(code);
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
      toast.error(friendlyMessage(e, "Barcode lookup failed"));
      setLearnBarcode(code);
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
        const fallback = await localReceiptOcr(blob);
        if (fallback.length === 0) {
          openManual("No products found on that receipt — add items manually.");
          return;
        }
        setReceiptLines(fallback);
        setReceiptPicked(Object.fromEntries(fallback.map((_, i) => [i, true])));
        toast.info("Used local OCR instead of AI.");
        return;
      }
      setReceiptLines(items);
      setReceiptPicked(Object.fromEntries(items.map((_, i) => [i, true])));
      toast.success(`${items.length} line item${items.length === 1 ? "" : "s"} found`);
    } catch (e) {
      try {
        const fallback = await localReceiptOcr(blob);
        if (fallback.length === 0) throw e;
        setReceiptLines(fallback);
        setReceiptPicked(Object.fromEntries(fallback.map((_, i) => [i, true])));
        toast.info("Used local OCR instead of AI.");
      } catch {
        toast.error(friendlyMessage(e, "Receipt scan failed"));
      }
    } finally {
      setBusy(null);
    }
  }

  async function importReceipt(all?: ReceiptLine[]) {
    if (!receiptLines) return;
    const chosen = all ?? receiptLines.filter((_, i) => receiptPicked[i]);
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

  /** Adds every detected item to the pantry with its suggested defaults. */
  async function addAllDetections() {
    if (detections.length === 0) return;
    setAddingAll(true);
    const purchase = new Date().toISOString().slice(0, 10);
    let added = 0;
    try {
      for (const c of detections) {
        await addItem.mutateAsync({
          name: c.name,
          brand: c.brand,
          category: c.category,
          quantity: c.quantity,
          unit: c.unit,
          purchase_date: purchase,
          expiry_date: candidateExpiry(c, c.storage, purchase),
          storage: c.storage as StorageType,
          image_url: c.image_url,
          source: c.source || "camera",
          price: null,
        });
        added++;
      }
      await recordScan.mutateAsync({ method: "camera", items_added: added });
      toast.success(`${added} item${added === 1 ? "" : "s"} added to your pantry`);
      setDetections([]);
    } catch (e) {
      toast.error(friendlyMessage(e, "Could not add all items"));
    } finally {
      setAddingAll(false);
    }
  }

  /* ----------------------------------- ui ------------------------------------ */

  const activeTab: "camera" | "barcode" | "receipt" | "device" = Route.useSearch().tab ?? "camera";
  const TOOL_META = {
    camera: {
      icon: Camera,
      title: "Scan with Camera",
      subtitle: "Point at your groceries — FreshTrack recognises them instantly.",
    },
    barcode: {
      icon: Barcode,
      title: "Scan Barcode",
      subtitle: "Hold a packaged product's barcode inside the frame.",
    },
    receipt: {
      icon: Receipt,
      title: "Scan Receipt",
      subtitle: "Photograph your grocery bill and import every line.",
    },
    device: {
      icon: Cpu,
      title: "Fridge Device",
      subtitle: "Intake from your paired FreshTrack camera.",
    },
  } as const;
  const meta = TOOL_META[activeTab];

  return (
    <PageContainer>
      <div className="mb-6 flex items-start gap-3">
        <Button
          size="icon"
          variant="ghost"
          className="mt-1 rounded-xl"
          aria-label="Back to pantry"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-[28px] font-bold leading-tight tracking-[-0.035em]">
            <meta.icon className="h-6 w-6 text-primary" strokeWidth={1.9} />
            {meta.title}
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
            {meta.subtitle}
          </p>
        </div>
      </div>

      <Tabs value={activeTab}>


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
              {detections.length > 0 && (
                <Button
                  className="press mb-3 h-11 w-full rounded-2xl"
                  onClick={addAllDetections}
                  disabled={addingAll}
                >
                  {addingAll ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Add all {detections.length} items
                </Button>
              )}
              <p className="mb-2 text-xs text-muted-foreground">
                Tap any item to edit its quantity, storage and expiry before adding.
              </p>
              <ul className="space-y-2">
                {detections.map((c) => {
                  const conf = c.confidence != null ? confidenceLabel(c.confidence) : null;
                  const prediction = predictShelfLife(
                    c,
                    c.storage,
                    new Date().toISOString().slice(0, 10),
                  );
                  const refuseEstimate = shouldRefuseShelfLifeEstimate(c);
                  return (
                    <li key={c.key}>
                      <button
                        type="button"
                        onClick={() => setConfirming(c)}
                        className="press surface-card flex w-full items-start justify-between gap-3 p-3 text-left"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.category} · {c.storage} ·{" "}
                            <span className="font-medium text-foreground">
                              {refuseEstimate ? "no estimate" : `~${prediction.days}d left`}
                            </span>{" "}
                            · {refuseEstimate ? "I do not recognize this product." : expiryText(prediction.expiry).toLowerCase()}
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

          {receiptLines && receiptLines.length > 0 && (
            <section className="mt-4 animate-fade-up">
              <h2 className="mb-2 text-base font-semibold">
                Detected products ({receiptLines.length})
              </h2>
              <Button
                className="press mb-3 h-11 w-full rounded-2xl"
                onClick={() => {
                  setReceiptPicked(Object.fromEntries(receiptLines.map((_, i) => [i, true])));
                  void importReceipt(receiptLines);
                }}
                disabled={importing}
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Add all {receiptLines.length} item{receiptLines.length === 1 ? "" : "s"}
              </Button>
              <p className="mb-2 text-xs text-muted-foreground">
                Tap any product to edit its quantity, storage and expiry before adding.
              </p>
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
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setPendingMethod("receipt");
                        setReceiptEditIndex(i);
                        setConfirming(
                          buildCandidate({
                            name: line.name,
                            unit: line.unit,
                            quantity: line.quantity,
                            source: "receipt",
                          }),
                        );
                      }}
                    >
                      <p className="truncate text-sm font-medium">{line.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.quantity} {line.unit}
                        {line.price != null ? ` · ₹${line.price}` : ""} · tap to edit
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                className="press mt-3 h-12 w-full rounded-2xl"
                onClick={() => void importReceipt()}
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
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(null);
            setReceiptEditIndex(null);
          }
        }}
        onSaved={(c) => {
          setDetections((d) => d.filter((x) => x.key !== c.key));
          if (receiptEditIndex != null) {
            const idx = receiptEditIndex;
            setReceiptLines((lines) => (lines ? lines.filter((_, i) => i !== idx) : lines));
            setReceiptPicked((p) => {
              const next: Record<number, boolean> = {};
              Object.keys(p)
                .map(Number)
                .forEach((k) => {
                  if (k < idx) next[k] = p[k];
                  else if (k > idx) next[k - 1] = p[k];
                });
              return next;
            });
            setReceiptEditIndex(null);
          }
          void recordScan.mutateAsync({ method: c.source || pendingMethod, items_added: 1 });
        }}
      />

      <UnknownBarcodeDialog
        open={Boolean(learnBarcode)}
        barcode={learnBarcode}
        userId={user?.id}
        onOpenChange={(open) => !open && setLearnBarcode(null)}
        onDone={(info) => {
          setLearnBarcode(null);
          if (!info?.name) return;
          if (learnBarcode)
            rememberBarcode(learnBarcode, info.name, info.quantity, info.shelfLifeDays);
          setPendingMethod("barcode");
          setConfirming(
            buildCandidate({
              name: info.name,
              packageSize: info.quantity || null,
              packaged: true,
              source: "barcode",
              image_url: info.imageUrl ?? null,
              shelfLifeDays: info.shelfLifeDays || undefined,
              exactShelf: info.shelfLifeDays > 0,
            }),
          );

          toast.info("Now add it to your own pantry.");
        }}
      />

      <AlertDialog open={noItemsOpen} onOpenChange={setNoItemsOpen}>
        <AlertDialogContent className="max-w-xs rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>No items detected</AlertDialogTitle>
            <AlertDialogDescription>Search manually?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel className="mt-0 rounded-2xl">No</AlertDialogCancel>
            <AlertDialogAction className="rounded-2xl" onClick={() => setManualOpen(true)}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
