/** Lightweight client-side error reporting used by the root error boundary. */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  try {
    // eslint-disable-next-line no-console
    console.error("[FreshTrack]", error, context ?? {});
  } catch {
    /* noop */
  }
}
