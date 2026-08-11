import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ScanCamera } from "@/components/ScanCamera"; // adjust path if ScanCamera.tsx lives elsewhere
import { Button } from "@/components/ui/button";

// Lazy-load tfjs so it doesn't bloat the initial app bundle
let tfPromise: Promise<typeof import("@tensorflow/tfjs")> | null = null;
function getTf() {
  if (!tfPromise) tfPromise = import("@tensorflow/tfjs");
  return tfPromise;
}

let modelPromise: Promise<import("@tensorflow/tfjs").LayersModel> | null = null;
async function getModel() {
  const tf = await getTf();
  if (!modelPromise) {
    modelPromise = tf.loadLayersModel("/tfjs_model/model.json");
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
  label: string;
  confidence: number;
}

export default function ScanWithModel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Prediction | null>(null);
  const warmedUp = useRef(false);

  // Warm up model + class names in the background as soon as the screen opens
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
      const tf = await getTf();
      const model = await getModel();
      const classNames = await getClassNames();

      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 160;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");
      ctx.drawImage(bitmap, 0, 0, 160, 160);

      const prediction = tf.tidy(() => {
        let input = tf.browser.fromPixels(canvas, 3).toFloat();
        // Match training preprocessing: mobilenet_v2.preprocess_input -> (pixel / 127.5) - 1
        input = input.div(127.5).sub(1);
        input = input.expandDims(0); // batch dimension -> [1, 160, 160, 3]
        return model.predict(input) as import("@tensorflow/tfjs").Tensor;
      });

      const scores = await prediction.data();
      prediction.dispose();

      let bestIdx = 0;
      let bestScore = -Infinity;
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > bestScore) {
          bestScore = scores[i];
          bestIdx = i;
        }
      }

      const rawLabel = classNames[bestIdx] ?? "Unknown";
      const label = rawLabel.replace("__", " ").replace(/_/g, " ");

      setResult({ label, confidence: bestScore * 100 });
    } catch (err) {
      console.error(err);
      toast.error("Couldn't analyse that photo. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Scan with My Model</h1>
          <p className="text-sm text-muted-foreground">
            Uses our own trained freshness model — point at a fruit or vegetable.
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
        <div className="surface-card p-4">
          <p className="text-sm text-muted-foreground">Result</p>
          <p className="text-lg font-semibold capitalize">{result.label}</p>
          <p className="text-sm text-muted-foreground">
            Confidence: {result.confidence.toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  );
}
