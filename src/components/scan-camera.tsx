import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, ScanLine, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

interface Props {
  mode: "photo" | "barcode";
  busy?: boolean;
  busyLabel?: string;
  hint: string;
  captureLabel?: string;
  onCapture?: (blob: Blob) => void;
  onBarcode?: (code: string, frame?: Blob) => void;
  onPickFile?: (file: File) => void;
}

/** Live camera viewport with capture, gallery upload and optional barcode reading. */
export function ScanCamera({
  mode,
  busy = false,
  busyLabel = "Analysing…",
  hint,
  captureLabel = "Capture item",
  onCapture,
  onBarcode,
  onPickFile,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const firedRef = useRef(false);
  const [on, setOn] = useState(false);
  const [supportsBarcode, setSupportsBarcode] = useState(true);

  useEffect(() => () => stop(), []);

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setOn(false);
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      firedRef.current = false;
      setOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      toast.error("Camera unavailable. Grant permission or upload a photo instead.");
    }
  }

  // Barcode reading loop.
  useEffect(() => {
    if (mode !== "barcode" || !on) return;
    const Ctor = (
      window as unknown as { BarcodeDetector?: new (o?: unknown) => BarcodeDetectorLike }
    ).BarcodeDetector;
    if (!Ctor) {
      setSupportsBarcode(false);
      return;
    }
    const detector = new Ctor({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"],
    });
    let cancelled = false;
    const timer = window.setInterval(async () => {
      const video = videoRef.current;
      if (cancelled || !video || video.readyState < 2 || firedRef.current) return;
      try {
        const codes = await detector.detect(video);
        const value = codes[0]?.rawValue?.replace(/\D/g, "");
        if (value && value.length >= 6) {
          firedRef.current = true;
          const frame = await grabFrame();
          stop();
          onBarcode?.(value, frame ?? undefined);
        }
      } catch {
        /* keep scanning */
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mode, on, onBarcode]);

  async function grabFrame(): Promise<Blob | null> {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 720;
    const height = video.videoHeight || 960;
    const scale = Math.min(1, 1600 / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.84));
  }

  async function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 720;
    const height = video.videoHeight || 960;
    const scale = Math.min(1, 1600 / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.84));
    if (!blob) {
      toast.error("Could not capture the photo");
      return;
    }
    stop();
    onCapture?.(blob);
  }

  return (
    <div className="surface-card overflow-hidden p-4">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-muted">
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn("h-full w-full object-cover", !on && "hidden")}
        />

        {!on && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <ScanLine className="h-10 w-10 text-primary" />
            <p className="max-w-xs text-sm text-muted-foreground">{hint}</p>
          </div>
        )}

        {on && (
          <>
            <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-primary/70" />
            <div className="scan-beam pointer-events-none absolute inset-x-6 top-6 h-24 rounded-2xl" />
          </>
        )}

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">{busyLabel}</p>
          </div>
        )}
      </div>

      {mode === "barcode" && on && !supportsBarcode && (
        <p className="mt-3 rounded-2xl bg-warning/15 px-4 py-2.5 text-xs font-medium text-warning">
          This browser can&apos;t read barcodes live. Capture the barcode photo or use manual
          search.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        {on ? (
          <>
            <Button className="press h-12 flex-1 rounded-2xl" onClick={capture} disabled={busy}>
              <Camera className="h-4 w-4" />
              {mode === "barcode" ? "Capture barcode" : captureLabel}
            </Button>
            <Button
              variant="secondary"
              className="h-12 rounded-2xl"
              onClick={stop}
              aria-label="Stop camera"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button className="press h-12 flex-1 rounded-2xl" onClick={start} disabled={busy}>
              <Camera className="h-4 w-4" /> Open camera
            </Button>
            <Button
              variant="secondary"
              className="press h-12 rounded-2xl"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <ImagePlus className="h-4 w-4" /> Gallery
            </Button>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) (onPickFile ?? onCapture)?.(file);
        }}
      />
    </div>
  );
}
