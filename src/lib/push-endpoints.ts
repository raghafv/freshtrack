/**
 * Allow-list of legitimate Web Push service hosts.
 *
 * Push endpoints are supplied by the browser but travel through the client, so
 * a malicious caller could store any URL and make the server POST signed VAPID
 * requests to it (SSRF). We therefore only ever accept — and only ever send to
 * — HTTPS URLs on a known push service domain.
 */
const ALLOWED_HOST_SUFFIXES = [
  // Chrome / Edge / Chromium (FCM)
  "fcm.googleapis.com",
  "android.googleapis.com",
  "googleapis.com",
  // Firefox
  "push.services.mozilla.com",
  "mozilla.com",
  // Microsoft WNS (Edge legacy)
  "notify.windows.com",
  "push.apple.com",
  // Safari / Apple
  "web.push.apple.com",
] as const;

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

/** True when the URL is an HTTPS endpoint on a recognised push service. */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password || url.port) return false;
  return hostAllowed(url.hostname);
}
