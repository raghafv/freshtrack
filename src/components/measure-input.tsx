import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { stepForUnit, unitOptionsFor, type ProductForm } from "@/lib/grocery-catalog";

interface Props {
  id?: string;
  label?: string;
  form: ProductForm;
  value: string;
  unit: string;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
}

function round(n: number) {
  return Number(n.toFixed(3));
}

/**
 * Amount input that switches between weight (g/kg), volume (mL/L) and piece
 * count depending on the product form.
 */
export function MeasureInput({
  id = "measure",
  label = "Amount",
  form,
  value,
  unit,
  onValueChange,
  onUnitChange,
}: Props) {
  const units = unitOptionsFor(form);
  const step = stepForUnit(unit);

  const bump = (dir: 1 | -1) => {
    const next = round((Number(value) || 0) + dir * step);
    onValueChange(String(Math.max(step, next)));
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          {form === "liquid"
            ? "volume or pieces"
            : form === "solid"
              ? "weight or pieces"
              : "pieces or weight"}
        </span>
      </Label>
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="secondary"
          aria-label="Decrease amount"
          className="h-11 w-11 shrink-0 rounded-xl"
          onClick={() => bump(-1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          className="h-11 text-center text-base font-semibold"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        />
        <Button
          size="icon"
          variant="secondary"
          aria-label="Increase amount"
          className="h-11 w-11 shrink-0 rounded-xl"
          onClick={() => bump(1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div
        className="grid gap-1 rounded-xl bg-muted/60 p-1"
        style={{ gridTemplateColumns: `repeat(${units.length}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Measurement unit"
      >
        {units.map((u) => (
          <button
            key={u}
            type="button"
            aria-pressed={unit === u}
            onClick={() => onUnitChange(u)}
            className={cn(
              "press rounded-lg py-1.5 text-xs font-semibold transition-colors",
              unit === u
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {u === "pcs" ? "pieces" : u}
          </button>
        ))}
      </div>
    </div>
  );
}
