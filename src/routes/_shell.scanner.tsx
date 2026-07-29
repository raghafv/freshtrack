import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Barcode, Camera, Cpu, Loader2, ScanLine, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader } from "@/components/layout";
import { ItemFormDialog, type ItemFormPrefill } from "@/components/item-form-dialog";
import { useAuth } from "@/lib/auth";
import { useRecordScan, useScanHistory, useSettings, uploadPantryImage } from "@/lib/data";
import { guessCategory } from "@/lib/freshtrack";

export const Route = createFileRoute("/_shell/scanner")({
  head: () => ({
    meta: [
      { title: "Scanner — Add Groceries with Your Camera | FreshTrack" },
      {
        name: "description",
        content:
          "Capture groceries with your phone camera or look them up by barcode, then add them to your FreshTrack pantry instantly.",
      },
      { property: "og:title", content: "FreshTrack Scanner" },
      {
        property: "og:description",
        content: "Camera capture, barcode lookup and smart-device intake for your pantry.",
      },
    ],
  }),
  component: ScannerPage,
});

function ScannerPage() {
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const { data: scans = [] } = useScanHistory();
  const recordScan = useRecordScan();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [prefill, setPrefill] = useState<ItemFormPrefill | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [pendingMethod, setPendingMethod] = useState("camera");

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      toast.error("Camera unavailable. Grant permission or add the item manually.");
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !user) return;
    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 960;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Capture failed");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85),
      );
      if (!blob) throw new Error("Capture failed");
      const url = await uploadPantryImage(user.id, blob, "jpg");
      stopCamera();
      setPendingMethod("camera");
      setPrefill({ image_url: url, source: "camera" });
      setFormOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not capture photo");
    } finally {
      setCapturing(false);
    }
  }

  async function lookupBarcode() {
    const code = barcode.replace(/\D/g, "");
    if (code.length < 6) {
      toast.error("Enter a valid barcode number");
      return;
    }
    setLookingUp(true);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,image_url,categories_tags,quantity`,
      );
      const json = (await res.json()) as {
        status?: number;
        product?: {
          product_name?: string;
          brands?: string;
          image_url?: string;
          quantity?: string;
        };
      };
      if (json.status !== 1 || !json.product?.product_name) {
        toast.info("Product not found — fill in the details manually.");
        setPendingMethod("barcode");
        setPrefill({ source: "barcode" });
        setFormOpen(true);
        return;
      }
      const name = json.product.product_name;
      setPendingMethod("barcode");
      setPrefill({
        name,
        brand: json.product.brands?.split(",")[0]?.trim(),
        category: guessCategory(name),
        image_url: json.product.image_url ?? null,
        source: "barcode",
      });
      setFormOpen(true);
      toast.success(`Found: ${name}`);
    } catch {
      toast.error("Barcode lookup failed. Check your connection.");
    } finally {
      setLookingUp(false);
    }
  }

  function deviceIntake() {
    setPendingMethod("device");
    setPrefill({ source: "device", storage: "Fridge" });
    setFormOpen(true);
    toast.info("Simulating fridge device intake — confirm the item details.");
  }

  return (
    <PageContainer>
      <PageHeader
        title="Scanner"
        subtitle="Your phone camera works exactly like the FreshTrack fridge device."
      />

      <Tabs defaultValue="camera">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl">
          <TabsTrigger value="camera" className="rounded-xl">
            <Camera className="mr-1 h-4 w-4" /> Camera
          </TabsTrigger>
          <TabsTrigger value="barcode" className="rounded-xl">
            <Barcode className="mr-1 h-4 w-4" /> Barcode
          </TabsTrigger>
          <TabsTrigger value="device" className="rounded-xl">
            <Cpu className="mr-1 h-4 w-4" /> Device
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera" className="mt-4">
          <div className="surface-card overflow-hidden p-4">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-muted">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`h-full w-full object-cover ${cameraOn ? "" : "hidden"}`}
              />
              {!cameraOn && (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <ScanLine className="h-10 w-10 text-primary" />
                  <p className="max-w-xs px-6 text-sm text-muted-foreground">
                    Point your camera at the item, capture it, and confirm the details.
                  </p>
                </div>
              )}
              {cameraOn && (
                <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-primary/70" />
              )}
            </div>

            <div className="mt-4 flex gap-2">
              {cameraOn ? (
                <>
                  <Button
                    className="press h-12 flex-1 rounded-2xl"
                    onClick={capture}
                    disabled={capturing}
                  >
                    {capturing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    Capture item
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-12 rounded-2xl"
                    onClick={stopCamera}
                    aria-label="Stop camera"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button className="press h-12 w-full rounded-2xl" onClick={startCamera}>
                  <Camera className="h-4 w-4" /> Open camera
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="barcode" className="mt-4">
          <div className="surface-card p-5">
            <p className="mb-3 text-sm text-muted-foreground">
              Enter the barcode number printed on the pack. FreshTrack looks it up in the Open Food
              Facts database and fills in the details for you.
            </p>
            <div className="flex gap-2">
              <Input
                value={barcode}
                inputMode="numeric"
                maxLength={20}
                placeholder="e.g. 5449000000996"
                className="h-12 rounded-2xl"
                onChange={(e) => setBarcode(e.target.value)}
              />
              <Button
                className="press h-12 rounded-2xl"
                onClick={lookupBarcode}
                disabled={lookingUp}
              >
                {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look up"}
              </Button>
            </div>
          </div>
        </TabsContent>

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
            <Button variant="secondary" className="press h-12 w-full rounded-2xl" onClick={deviceIntake}>
              Simulate device intake
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold">Scan history</h2>
        {scans.length === 0 ? (
          <p className="surface-card p-4 text-sm text-muted-foreground">
            No scans yet. Every capture, barcode lookup and device intake is logged here.
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
