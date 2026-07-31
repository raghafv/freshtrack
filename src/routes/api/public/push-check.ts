import { createFileRoute } from "@tanstack/react-router";

/** Diagnostics only: reports whether the VAPID key pair is usable. Never returns key material. */
export const Route = createFileRoute("/api/public/push-check")({
  server: {
    handlers: {
      GET: async () => {
        const pub = process.env.VAPID_PUBLIC_KEY ?? "";
        const priv = process.env.VAPID_PRIVATE_KEY ?? "";
        const report: Record<string, unknown> = {
          hasPublic: Boolean(pub),
          hasPrivate: Boolean(priv),
          publicLength: pub.length,
          privateLength: priv.length,
          subject: process.env.VAPID_SUBJECT ? "set" : "missing",
        };
        try {
          const b64 = (b: Uint8Array) => {
            let s = "";
            for (const x of b) s += String.fromCharCode(x);
            return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
          };
          const norm = pub.replace(/-/g, "+").replace(/_/g, "/");
          const raw = Uint8Array.from(
            atob(norm + "=".repeat((4 - (norm.length % 4)) % 4)),
            (c) => c.charCodeAt(0),
          );
          report.publicRawBytes = raw.length;
          report.publicPrefix = raw[0];
          const key = await crypto.subtle.importKey(
            "jwk",
            {
              kty: "EC",
              crv: "P-256",
              x: b64(raw.slice(1, 33)),
              y: b64(raw.slice(33, 65)),
              d: priv,
              ext: true,
            },
            { name: "ECDSA", namedCurve: "P-256" },
            false,
            ["sign"],
          );
          await crypto.subtle.sign(
            { name: "ECDSA", hash: "SHA-256" },
            key,
            new TextEncoder().encode("test"),
          );
          report.keyPairUsable = true;
        } catch (error) {
          report.keyPairUsable = false;
          report.error = error instanceof Error ? error.message : String(error);
        }
        return Response.json(report);
      },
    },
  },
});
