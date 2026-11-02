import { useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { evaluatorVerify } from "@/lib/evaluator.functions";
import { markEvaluatorSession } from "@/lib/evaluator";

/** Small passcode box that unlocks evaluator-only features on this device. */
export function EvaluatorUnlock({ onUnlocked }: { onUnlocked?: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await evaluatorVerify({ data: { code } });
      if (!res.ok) {
        toast.error("That code didn't work.");
        return;
      }
      markEvaluatorSession();
      toast.success("Evaluator features unlocked.");
      setCode("");
      onUnlocked?.();
    } catch {
      toast.error("Couldn't check the code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        type="password"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Evaluator code"
        aria-label="Evaluator code"
        autoComplete="off"
      />
      <Button type="submit" disabled={busy || !code.trim()}>
        <Lock className="mr-1 h-4 w-4" />
        {busy ? "Checking" : "Unlock"}
      </Button>
    </form>
  );
}
