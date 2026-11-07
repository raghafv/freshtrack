/** Returns a BarcodeDetector constructor: native when available, else a ZXing (WASM) ponyfill for iPhone Safari. */
export type DetectorCtor = new (o?: { formats?: string[] }) => {
  detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

let cached: Promise<DetectorCtor | null> | null = null;

export function getBarcodeDetector(): Promise<DetectorCtor | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (cached) return cached;
  const native = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  cached = native
    ? Promise.resolve(native)
    : import("barcode-detector/ponyfill")
        .then((m) => m.BarcodeDetector as unknown as DetectorCtor)
        .catch(() => null);
  return cached;
}
