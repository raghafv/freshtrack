import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, PencilLine, Sparkles } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { QuickAddDialog } from "@/components/quick-add-dialog";
import { ItemFormDialog, type ItemFormPrefill } from "@/components/item-form-dialog";
import { useSettings } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { isEvaluatorSession, isEvaluatorUser } from "@/lib/evaluator";

type Option = {
  key: string;
  icon: typeof Camera;
  label: string;
  hint: string;
};

const BASE_OPTIONS: Option[] = [
  {
    key: "camera",
    icon: Camera,
    label: "Scan items",
    hint: "Fruit & veg photo, barcode or receipt",
  },
  { key: "manual", icon: PencilLine, label: "Manual add", hint: "Search the grocery catalog" },
];

const MODEL_OPTION: Option = {
  key: "mymodel",
  icon: Sparkles,
  label: "Our Capstone Freshness Model",
  hint: "Team-trained model · 14 produce types",
};

/**
 * Action sheet behind the centre "Add" button. Two choices: one scanner with
 * mode switching inside it, and manual add. The capstone model only appears
 * for evaluators.
 */
export function AddSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const [quickOpen, setQuickOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [prefill, setPrefill] = useState<ItemFormPrefill | undefined>();
  const [evaluator, setEvaluator] = useState(false);

  useEffect(() => {
    if (open) setEvaluator(isEvaluatorUser(user?.email) || isEvaluatorSession());
  }, [open, user?.email]);

  const options = evaluator ? [...BASE_OPTIONS, MODEL_OPTION] : BASE_OPTIONS;

  function choose(key: string) {
    onOpenChange(false);
    if (key === "manual") {
      setTimeout(() => setQuickOpen(true), 180);
      return;
    }
    if (key === "mymodel") {
      setTimeout(() => navigate({ to: "/scan-my-model" }), 140);
      return;
    }
    setTimeout(() => navigate({ to: "/scanner", search: { tab: "camera" } }), 140);
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-[2rem] border-none pb-8">
          <DrawerHeader className="pb-2 pt-1 text-left">
            <DrawerTitle className="text-[22px] tracking-[-0.02em]">Add to pantry</DrawerTitle>
            <DrawerDescription className="text-[13px]">
              Choose how you'd like to capture what you just bought.
            </DrawerDescription>
          </DrawerHeader>

          <div className="grid gap-3 px-4 pt-2">
            {options.map(({ key, icon: Icon, label, hint }, i) => (
              <button
                key={key}
                type="button"
                onClick={() => choose(key)}
                style={{ animationDelay: `${i * 45}ms` }}
                className="press animate-fade-up surface-card flex min-h-16 items-center gap-4 px-5 py-4 text-left"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold tracking-[-0.01em]">
                    {label}
                  </span>
                  <span className="block truncate text-[12.5px] text-muted-foreground">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      <QuickAddDialog
        open={quickOpen}
        onOpenChange={setQuickOpen}
        defaultStorage={settings?.default_storage}
        defaultUnit={settings?.default_unit}
        onDetails={(p) => {
          setPrefill(p);
          setFormOpen(true);
        }}
      />

      <ItemFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setPrefill(undefined);
        }}
        prefill={prefill}
        defaultStorage={settings?.default_storage}
        defaultUnit={settings?.default_unit}
      />
    </>
  );
}
