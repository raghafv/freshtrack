import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  RotateCcw,
  Cpu,
  Layers3,
  ShieldCheck,
  ChartNoAxesCombined,
  ScanLine,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { ScanCamera } from "@/components/scan-camera";
import { ScanConfirmDialog } from "@/components/scan-confirm-dialog";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useRecordScan, uploadPantryImage } from "@/lib/data";
import { buildCandidate, type ScanCandidate } from "@/lib/scan";

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
  const navigate = useNavigate();
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
    if (!user) {
      toast.info("Sign in to save items to your pantry.");
      navigate({ to: "/" });
      return;
    }
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

  

  return (
    <PageContainer>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-10">
        <header className="border-b border-border pb-6">
          <div className="mb-4 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => {
                if (window.history.length > 1) window.history.back();
                else navigate({ to: "/" });
              }}
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
              <Layers3 className="h-3.5 w-3.5" />
              FRESHTRACK · CBSE CLASS 12 CAPSTONE
            </span>
          </div>
          <div className="pl-1">
            <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
              Our produce freshness model
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              We built and trained this computer-vision model as part of our FreshTrack CBSE Class
              12 capstone project. It looks at a produce photo and predicts both the item and
              whether it appears healthy or rotten. Try it below, then explore our training and
              evaluation results.
            </p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
            <ProjectStat icon={ScanLine} value="14" label="produce types" />
            <ProjectStat icon={Layers3} value="28" label="item + condition classes" />
            <ProjectStat icon={Cpu} value="160 × 160" label="RGB image input" />
            <ProjectStat icon={ShieldCheck} value="In browser" label="model prediction" />
          </div>
        </header>

        <section aria-labelledby="try-model-heading" className="flex flex-col gap-4">
          <SectionHeading
            icon={ScanLine}
            eyebrow="LIVE DEMO"
            title="Try our model"
            description="Capture a photo or choose one from your device. The model compares it with its 28 learned labels."
          />
          <div className="surface-card flex flex-col gap-4 p-4 sm:p-5">
            <ScanCamera
              mode="photo"
              busy={busy}
              busyLabel="Running our trained model…"
              hint="Frame one fruit or vegetable clearly, then capture."
              captureLabel="Capture item"
              onCapture={handleCapture}
              onPickFile={handleCapture}
            />

            {result && (
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Model prediction
                </p>
                <p className="mt-1 text-xl font-semibold capitalize">{result.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Looks {result.healthy ? "healthy" : "rotten"} · Model score: {" "}
                  {(result.confidence * 100).toFixed(1)}%
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button className="flex-1" onClick={addToPantry} disabled={busy}>
                    <Check className="mr-2 h-4 w-4" />
                    Add to pantry
                  </Button>
                  <Button variant="outline" onClick={() => setResult(null)} disabled={busy}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Try another photo
                  </Button>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  This score is the model’s confidence for its top label, not a guarantee of food
                  safety. You can review and edit the item before saving it.
                </p>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="how-it-works-heading" className="flex flex-col gap-4">
          <SectionHeading
            icon={Cpu}
            eyebrow="HOW IT WORKS"
            title="From photo to prediction"
            description="A compact image-classification pipeline designed to run inside the FreshTrack web app."
          />
          <ol className="grid gap-3 sm:grid-cols-3">
            <ProcessStep
              number="01"
              title="Prepare the photo"
              text="The captured image is resized to 160 × 160 pixels and represented as three RGB color channels."
            />
            <ProcessStep
              number="02"
              title="Normalize pixels"
              text="Pixel values are scaled from 0–255 to approximately −1 to +1, matching the model’s expected input."
            />
            <ProcessStep
              number="03"
              title="Choose a class"
              text="The model scores 28 labels: 14 produce types, each with Healthy and Rotten conditions. The highest score is shown."
            />
          </ol>
          <p className="text-sm leading-6 text-muted-foreground">
            TensorFlow.js loads the trained model in the browser and performs the prediction there.
            If you choose to add the result to your pantry, FreshTrack continues through its normal
            item-saving flow; saving the photo may upload it with that pantry item.
          </p>
        </section>

        <section aria-labelledby="training-results-heading" className="flex flex-col gap-4">
          <SectionHeading
            icon={ChartNoAxesCombined}
            eyebrow="TRAINING RESULTS"
            title="How learning progressed"
            description="These curves plot training and validation accuracy and loss over 13 epochs. The dashed marker identifies where fine-tuning begins."
          />
          <ChartFigure
            src="/accuracy_curve.png"
            alt="Training chart showing accuracy and loss across epochs 0 to 12, with a dashed line marking the start of fine-tuning at epoch 7."
            caption="Accuracy and loss during training"
            linkLabel="Open accuracy and loss chart"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <ExplainBlock title="Accuracy: how often the class was right">
              <p>
                Accuracy is the share of examples assigned the correct label. The validation line
                rises to roughly 95% and stays near that level, while training accuracy improves
                overall. A validation score is useful as a check on examples not used for the
                training updates, but it does not promise the same result for every real-world
                photo.
              </p>
            </ExplainBlock>
            <ExplainBlock title="Loss: how wrong the predictions were">
              <p>
                Loss penalizes incorrect predictions, with larger penalties for more confident
                mistakes. Lower is generally better. The validation loss trends down across the
                run. Around epoch 8, the training curves visibly jump after fine-tuning begins,
                then recover; that instability is worth noting rather than hiding.
              </p>
            </ExplainBlock>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Read the validation curves alongside accuracy: a good-looking training score alone can
            hide weak generalization. These plots describe this training run, not a food-safety
            test or a guarantee of performance in every lighting, angle, variety, or stage of
            spoilage.
          </p>
        </section>

        <section aria-labelledby="confusion-heading" className="flex flex-col gap-4">
          <SectionHeading
            icon={ChartNoAxesCombined}
            eyebrow="CLASS-BY-CLASS CHECK"
            title="Where the model gets confused"
            description="The confusion matrix breaks results out across all 28 item-and-condition labels."
          />
          <ChartFigure
            src="/confusion_matrix.png"
            alt="A 28 by 28 confusion matrix for fourteen produce types, each split into Healthy and Rotten classes. Most counts appear along the main diagonal, with some off-diagonal errors."
            caption="Confusion matrix · 28 produce-condition classes"
            linkLabel="Open full-size confusion matrix"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <ExplainBlock title="How to read it">
              <p>
                Each row is the actual label and each column is the model’s predicted label. Counts
                on the main diagonal are correct classifications. Counts away from the diagonal
                show which labels were mixed up—for example, a healthy item predicted as rotten.
              </p>
            </ExplainBlock>
            <ExplainBlock title="What to look for">
              <p>
                The matrix is strongly concentrated along its diagonal, while the remaining cells
                reveal specific mistakes to investigate. Row totals differ, so raw counts should
                not be compared as if every class had the same number of examples; a normalized
                matrix would make per-class rates easier to compare.
              </p>
            </ExplainBlock>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            This chart does not identify the cause of a mistake. Similar colors, bruising, lighting,
            background, and class imbalance are possible factors to investigate with more
            examples—not conclusions proved by this matrix alone.
          </p>
        </section>

        <footer className="border-t border-border pt-5 text-sm leading-6 text-muted-foreground">
          <p className="font-semibold text-foreground">A CBSE Class 12 team project</p>
          <p className="mt-1">
            We developed this custom-trained image classifier as a team for our FreshTrack CBSE
            Class 12 capstone project. It is an educational prototype—not a substitute for checking
            produce yourself or following food safety guidance.
          </p>
          <a
            href="/FreshTrack_Technical_Explainer.pdf"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
          >
            Read the full technical explainer (PDF)
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </footer>
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

function ProjectStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Cpu;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-background p-3 sm:p-4">
      <Icon className="mb-2 h-4 w-4 text-primary" aria-hidden="true" />
      <p className="text-lg font-semibold leading-tight">{value}</p>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: typeof Cpu;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 className="text-2xl font-bold leading-tight">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function ProcessStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <li className="border-l-2 border-primary/40 pl-4 py-1">
      <p className="text-xs font-semibold text-primary">{number}</p>
      <h3 className="mt-1 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">{text}</p>
    </li>
  );
}

function ChartFigure({
  src,
  alt,
  caption,
  linkLabel,
}: {
  src: string;
  alt: string;
  caption: string;
  linkLabel: string;
}) {
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-card">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
        <span>{caption}</span>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {linkLabel}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </figcaption>
      <div className="bg-background p-2 sm:p-4">
        <img src={src} alt={alt} loading="lazy" className="mx-auto h-auto w-full" />
      </div>
    </figure>
  );
}

function ExplainBlock({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="border-t border-border pt-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-1 text-sm leading-6 text-muted-foreground">{children}</div>
    </div>
  );
}
