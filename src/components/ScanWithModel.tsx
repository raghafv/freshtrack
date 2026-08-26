import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ScanCamera } from "@/components/scan-camera";
import { ScanConfirmDialog } from "@/components/scan-confirm-dialog";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useRecordScan, uploadPantryImage } from "@/lib/data";
import { buildCandidate, confidenceLabel, type ScanCandidate } from "@/lib/scan";

declare global {
  interface Window {
    tf: any;
  }
}

const TFJS_CDN = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load TensorFlow.js"));
    document.head.appendChild(script);
  });
}

let modelPromise: Promise<any> | null = null;
async function getModel() {
  await loadScript(TFJS_CDN);
  if (!modelPromise) {
    modelPromise = window.tf.loadLayersModel("/tfjs_model/model.json");
  }
  return modelPromise;
}

let classNamesPromise: Promise<string[]> | null = null;
async function getClassNames() {
  if (!classNamesPromise) {
    classNamesPromise = fetch("/class_names.json").then((r) => r.json());
  }
  return classNamesPromise;
}

interface Prediction {
  /** Produce name, e.g. "Banana". */
  name: string;
  /** True when the model classified it as healthy rather than rotten. */
  healthy: boolean;
  /** 0-1 model confidence. */
  confidence: number;
}

/** Turns "Banana__Rotten" into a name plus a condition flag. */
function parseLabel(raw: string): { name: string; healthy: boolean } {
  const [namePart, conditionPart] = raw.split("__");
  const name = (namePart ?? raw).replace(/_/g, " ").trim();
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    healthy: (conditionPart ?? "healthy").toLowerCase() !== "rotten",
  };
}

export default function ScanWithModel() {
  const { user } = useAuth();
  const recordScan = useRecordScan();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Prediction | null>(null);
  const [confirming, setConfirming] = useState<ScanCandidate | null>(null);
  const lastBlob = useRef<Blob | null>(null);
  const warmedUp = useRef(false);

  useEffect(() => {
    if (warmedUp.current) return;
    warmedUp.current = true;
    getModel().catch(() => {
      toast.error("Couldn't load the freshness model. Check your connection and try again.");
    });
    getClassNames().catch(() => {
      toast.error("Couldn't load class labels.");
    });
  }, []);

  async function handleCapture(blob: Blob) {
    setBusy(true);
    setResult(null);
    try {
      const model = await getModel();
      const classNames = await getClassNames();
      const tf = window.tf;

      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 160;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");
      ctx.drawImage(bitmap, 0, 0, 160, 160);

      const prediction = tf.tidy(() => {
        let input = tf.browser.fromPixels(canvas, 3).toFloat();
        input = input.div(127.5).sub(1);
        input = input.expandDims(0);
        return model.predict(input);
      });

      const scores: Float32Array = await prediction.data();
      prediction.dispose();

      let bestIdx = 0;
      let bestScore = -Infinity;
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > bestScore) {
          bestScore = scores[i];
          bestIdx = i;
        }
      }

      const { name, healthy } = parseLabel(classNames[bestIdx] ?? "Unknown");
      lastBlob.current = blob;
      setResult({ name, healthy, confidence: bestScore });
    } catch (err) {
      console.error(err);
      toast.error("Couldn't analyse that photo. Try again.");
    } finally {
      setBusy(false);
    }
  }

  /** Hands the prediction to the normal FreshTrack add-to-pantry flow. */
  async function addToPantry() {
    if (!result) return;
    setBusy(true);
    let imageUrl: string | null = null;
    try {
      if (user && lastBlob.current) {
        try {
          imageUrl = await uploadPantryImage(user.id, lastBlob.current, "jpg");
        } catch {
          /* photo storage is best-effort */
        }
      }
      setConfirming(
        buildCandidate({
          name: result.name,
          confidence: result.confidence,
          // Rotten produce should expire much sooner than a fresh one.
          freshness: result.healthy ? 0.9 : 0.15,
          image_url: imageUrl,
          source: "camera",
          note: result.healthy
            ? null
            : "Our model thinks this one looks rotten — use it right away or bin it.",
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  const conf = result ? confidenceLabel(result.confidence) : null;

  return (
    <PageContainer>
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => window.history.back()}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Add using My AI Model</h1>
            <p className="text-sm text-muted-foreground">
              Uses our self-trained AI model to detect freshness.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Works with: Apple, Banana, Bellpepper, Carrot, Cucumber, Grape, Guava, Jujube, Mango,
              Orange, Pomegranate, Potato, Strawberry, Tomato (healthy or rotten).
            </p>
          </div>
        </div>

        <ScanCamera
          mode="photo"
          busy={busy}
          busyLabel="Running our trained model…"
          hint="Point the camera at a fruit or vegetable and capture."
          captureLabel="Capture item"
          onCapture={handleCapture}
          onPickFile={handleCapture}
        />

        {result && (
          <div className="surface-card flex flex-col gap-3 p-4">
            <div>
              <p className="text-sm text-muted-foreground">Result</p>
              <p className="text-lg font-semibold capitalize">{result.name}</p>
              <p className="text-sm text-muted-foreground">
                Looks {result.healthy ? "healthy" : "rotten"} · Confidence:{" "}
                {(result.confidence * 100).toFixed(1)}%{conf ? ` (${conf.label})` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="flex-1" onClick={addToPantry} disabled={busy}>
                <Check className="mr-2 h-4 w-4" />
                Add to pantry
              </Button>
              <Button variant="outline" onClick={() => setResult(null)} disabled={busy}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Rescan
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You can edit the name, amount, purchase date, storage and price on the next step.
            </p>
          </div>
        )}
      </div>

      <ScanConfirmDialog
        candidate={confirming}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        onSaved={() => {
          setResult(null);
          lastBlob.current = null;
          void recordScan.mutateAsync({ method: "camera", items_added: 1 });
        }}
      />
    </PageContainer>
  );
}
