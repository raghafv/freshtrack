/** Browser-side push helpers. Safe to import from components (guards for SSR). */

const SW_URL = "/push-sw.js";

export type PushState =
  | "unsupported"
  | "preview"
  | "needs-install"
  | "blocked"
  | "default"
  | "granted";

function unsupportedIOSVersion() {
  if (typeof window === "undefined") return false;
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (!match || !/iPad|iPhone|iPod/.test(navigator.userAgent)) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major < 16 || (major === 16 && minor < 4);
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Notifications cannot be requested reliably inside the editor preview iframe. */
export function inEmbeddedPreview() {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** iOS/iPadOS only exposes web push to PWAs added to the home screen. */
export function iosNeedsInstall() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator as unknown as { maxTouchPoints: number }).maxTouchPoints > 1);
  if (!isIOS) return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return !standalone;
}

export function pushState(): PushState {
  if (typeof window === "undefined") return "unsupported";
  if (inEmbeddedPreview()) return "preview";
  if (iosNeedsInstall()) return "needs-install";
  if (unsupportedIOSVersion()) return "unsupported";
  if (!pushSupported()) return "unsupported";
  const p = Notification.permission;
  if (p === "denied") return "blocked";
  return p === "granted" ? "granted" : "default";
}


function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

function keyToB64(sub: PushSubscription, name: "p256dh" | "auth") {
  const key = sub.getKey(name);
  if (!key) return "";
  let bin = "";
  for (const b of new Uint8Array(key)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface SubscribeResult {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
}

/** Asks for permission (if needed), registers the worker and returns the subscription. */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!pushSupported()) throw new Error("This browser doesn't support push notifications.");
  if (unsupportedIOSVersion()) throw new Error("Web notifications require iOS 16.4 or newer.");
  return Notification.permission === "granted" ? "granted" : Notification.requestPermission();
}

export async function subscribeToPush(
  publicKey: string,
  grantedPermission?: NotificationPermission,
): Promise<SubscribeResult> {
  if (inEmbeddedPreview())
    throw new Error(
      "Notifications can't be enabled inside the preview window. Open FreshTrack in its own tab or install it, then try again.",
    );
  if (iosNeedsInstall())
    throw new Error(
      "On iPhone, add FreshTrack to your Home Screen first (Share → Add to Home Screen), then enable notifications from there.",
    );
  if (!pushSupported()) throw new Error("This browser doesn't support push notifications.");

  const permission = grantedPermission ?? (await requestPushPermission());
  if (permission !== "granted")
    throw new Error(
      "Notification permission was blocked. Allow notifications for this site in your browser settings.",
    );


  const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const sub =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    }));

  return {
    endpoint: sub.endpoint,
    p256dh: keyToB64(sub, "p256dh"),
    auth: keyToB64(sub, "auth"),
    userAgent: navigator.userAgent.slice(0, 400),
  };
}

/** Removes the local subscription; returns the endpoint that was removed. */
export async function unsubscribeFromPush(): Promise<string | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  const sub = await registration?.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}

export async function currentEndpoint(): Promise<string | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  const sub = await registration?.pushManager.getSubscription();
  return sub?.endpoint ?? null;
}
