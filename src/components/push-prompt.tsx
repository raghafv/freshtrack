import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellOff, ExternalLink, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getPushPublicKey,
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
} from "@/lib/push.functions";
import {
  currentEndpoint,
  inEmbeddedPreview,
  pushState,
  subscribeToPush,
  unsubscribeFromPush,
  type PushState,
} from "@/lib/push-client";

const DISMISS_KEY = "freshtrack.push.dismissed";

/** Shared enable/disable logic for the prompt card and the settings toggle. */
export function usePush() {
  const [state, setState] = useState<PushState>("unsupported");
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  const getKey = useServerFn(getPushPublicKey);
  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(removePushSubscription);
  const test = useServerFn(sendTestPush);

  useEffect(() => {
    setState(pushState());
    currentEndpoint().then((e) => setActive(Boolean(e)));
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const { key } = await getKey({});
      if (!key) throw new Error("Push isn't configured on the server yet.");
      const sub = await subscribeToPush(key);
      await save({ data: sub });
      setActive(true);
      setState(pushState());
      await test({});
      toast.success("Notifications enabled", {
        description: "We just sent a test alert to this device.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't enable notifications.";
      setState(pushState());
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }, [getKey, save, test]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await remove({ data: { endpoint } });
      setActive(false);
      toast.success("Notifications turned off for this device.");
    } catch {
      toast.error("Couldn't turn notifications off.");
    } finally {
      setBusy(false);
    }
  }, [remove]);

  return { state, active, busy, enable, disable };
}

/** Soft, on-brand permission card shown once per device. */
export function PushPrompt() {
  const { state, active, busy, enable } = usePush();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const hide = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  if (dismissed || active || state !== "default" || inEmbeddedPreview()) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 px-4">
      <div className="glass mx-auto max-w-md overflow-hidden rounded-[26px] p-4 shadow-[0_20px_50px_-24px_rgba(10,9,8,0.55)]">
        <div className="flex items-start gap-3">
          <span className="gradient-hero flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-primary-foreground">
            <Bell className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Never lose food again
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Let FreshTrack run in the background and send expiry alerts straight to your lock
              screen.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" className="rounded-full px-4" onClick={enable} disabled={busy}>
                {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Allow notifications
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={hide}>
                Not now
              </Button>
            </div>
          </div>
          <button
            aria-label="Dismiss"
            onClick={hide}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Row for the settings page. */
export function PushSettingsRow() {
  const { state, active, busy, enable, disable } = usePush();

  const blockedish = state === "unsupported" || state === "blocked" || state === "preview" || state === "needs-install";

  const hint =
    state === "preview"
      ? "Open FreshTrack in its own browser tab (or install it) to switch on lock-screen alerts — the preview window blocks them."
      : state === "needs-install"
        ? "On iPhone, tap Share → Add to Home Screen, open FreshTrack from there, then enable alerts."
        : state === "unsupported"
          ? "This browser doesn't support push notifications."
          : state === "blocked"
            ? "Blocked in browser settings — allow notifications for this site to re-enable."
            : active
              ? "This device receives expiry alerts even when FreshTrack is closed."
              : "Get expiry alerts even when the app is closed.";

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">Lock-screen alerts</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      {state === "preview" ? (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 rounded-full"
          onClick={() => window.open(window.location.href, "_blank", "noopener")}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open app
        </Button>
      ) : (
        <Button
          size="sm"
          variant={active ? "outline" : "default"}
          className="shrink-0 rounded-full"
          disabled={busy || blockedish}
          onClick={active ? disable : enable}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : active ? (
            <>
              <BellOff className="mr-1.5 h-3.5 w-3.5" /> Turn off
            </>
          ) : (
            <>
              <Bell className="mr-1.5 h-3.5 w-3.5" /> Enable
            </>
          )}
        </Button>
      )}
    </div>
  );
}

