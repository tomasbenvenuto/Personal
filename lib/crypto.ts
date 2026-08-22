import crypto from "node:crypto";

// AES-256-GCM at rest for the Moodle password (see lib/moodle-sync.ts).
// Payload format: "<iv>.<authTag>.<ciphertext>", each base64.
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const keyB64 = process.env.MOODLE_CRYPTO_KEY;
  if (!keyB64) throw new Error("MOODLE_CRYPTO_KEY no está configurada.");
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) {
    throw new Error(
      "MOODLE_CRYPTO_KEY tiene que decodificar a 32 bytes (generala con: openssl rand -base64 32).",
    );
  }
  return key;
}

export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Payload cifrado inválido.");
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
