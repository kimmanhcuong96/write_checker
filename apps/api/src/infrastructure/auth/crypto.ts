const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
};

const fromBase64Url = (value: string): Uint8Array => {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export const randomToken = (byteLength = 32): string => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
};

export const sha256 = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toBase64Url(new Uint8Array(digest));
};

const hmacKey = (secret: string) =>
  crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

export const signValue = async (payload: string, secret: string): Promise<string> => {
  const encoded = toBase64Url(encoder.encode(payload));
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encoded));
  return `${encoded}.${toBase64Url(new Uint8Array(signature))}`;
};

export const verifySignedValue = async (signed: string, secret: string): Promise<string | null> => {
  const [encoded, signature] = signed.split(".");
  if (!encoded || !signature) return null;
  try {
    const key = await hmacKey(secret);
    const signatureBuffer = Uint8Array.from(fromBase64Url(signature)).buffer;
    const valid = await crypto.subtle.verify("HMAC", key, signatureBuffer, encoder.encode(encoded));
    return valid ? new TextDecoder().decode(fromBase64Url(encoded)) : null;
  } catch {
    return null;
  }
};
