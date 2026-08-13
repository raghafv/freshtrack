/**
 * Minimal Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) sender built on WebCrypto.
 * Server-only: never import this from client code.
 */

import { isAllowedPushEndpoint } from "./push-endpoints";

const enc = new TextEncoder();

function b64urlToBytes(value: string): Uint8Array {
  const pad = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = pad + "=".repeat((4 - (pad.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm as BufferSource, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

async function vapidAuthorization(endpoint: string) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@freshtrack.app";
  if (!publicKey || !privateKey) throw new Error("VAPID keys are not configured");

  const audience = new URL(endpoint).origin;
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64url(
    enc.encode(
      JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject }),
    ),
  );
  const unsigned = `${header}.${payload}`;

  const raw = b64urlToBytes(publicKey);
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: bytesToB64url(raw.slice(1, 33)),
    y: bytesToB64url(raw.slice(33, 65)),
    d: privateKey,
    ext: true,
  };
  const signingKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, enc.encode(unsigned)),
  );

  return `vapid t=${unsigned}.${bytesToB64url(signature)}, k=${publicKey}`;
}

async function encryptPayload(payload: string, p256dh: string, authSecret: string) {
  const uaPublic = b64urlToBytes(p256dh);
  const uaAuth = b64urlToBytes(authSecret);

  const localKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", localKeys.publicKey));

  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, localKeys.privateKey, 256),
  );

  const ikm = await hkdf(
    uaAuth,
    shared,
    concat(enc.encode("WebPush: info\0"), uaPublic, asPublic),
    32,
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cekBytes = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const cek = await crypto.subtle.importKey("raw", cekBytes as BufferSource, "AES-GCM", false, [
    "encrypt",
  ]);
  const plaintext = concat(enc.encode(payload), new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce as BufferSource },
      cek,
      plaintext as BufferSource,
    ),
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);

  return concat(salt, recordSize, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushMessage {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  emoji?: string;
}

export interface PushResult {
  ok: boolean;
  status: number;
  /** True when the subscription is dead and should be deleted. */
  gone: boolean;
  error?: string;
}

/** Sends one encrypted push message to one subscription. */
export async function sendPush(target: PushTarget, message: PushMessage): Promise<PushResult> {
  // Re-validate at send time: stored rows must never be able to steer an
  // authenticated outbound request at an internal address.
  if (!isAllowedPushEndpoint(target.endpoint)) {
    return { ok: false, status: 0, gone: true, error: "Unsupported push endpoint" };
  }
  try {
    const body = await encryptPayload(JSON.stringify(message), target.p256dh, target.auth);
    const res = await fetch(target.endpoint, {
      method: "POST",
      headers: {
        Authorization: await vapidAuthorization(target.endpoint),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "normal",
      },
      body: body as BodyInit,
      redirect: "error",
    });
    return {
      ok: res.ok,
      status: res.status,
      gone: res.status === 404 || res.status === 410,
      error: res.ok ? undefined : (await res.text()).slice(0, 200),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      gone: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
