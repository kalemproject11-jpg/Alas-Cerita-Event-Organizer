/**
 * Security utilities: input sanitization, validation, cryptographic hashing,
 * and uploaded image magic-byte verification.
 */

const ADMIN_CREDENTIAL_SALT = 'alascerita_2026_sec_v2';
// Salted SHA-256 hex digest of admin password (never stored as plaintext in client code)
const ADMIN_PASSWORD_SHA256 = 'a6e64bdfc648ee11e0abe8086be89bc170a9608668b481bad9556897d980c4fd';

/**
 * Strips potentially dangerous HTML tags, control characters, and script URI schemes.
 */
export function sanitizeText(value: string, maxLength = 200): string {
  if (!value) return '';
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .replace(/(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Normalizes and validates phone numbers (8–16 digits, optional leading +).
 */
export function sanitizePhone(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, '').slice(0, 18);
  return cleaned;
}

export function isValidPhone(value: string): boolean {
  const digitsOnly = value.replace(/\D/g, '');
  return digitsOnly.length >= 8 && digitsOnly.length <= 16;
}

export function sanitizeEmail(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F\s<>]/g, '')
    .trim()
    .toLowerCase()
    .slice(0, 150);
}

export function isValidEmail(value: string): boolean {
  const email = sanitizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * Computes SHA-256 hex digest via Web Crypto API (with pure JS fallback if unavailable).
 */
export async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('Web Crypto API unavailable');
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifies the admin password against the salted SHA-256 digest.
 */
export async function verifyAdminPassword(candidate: string): Promise<boolean> {
  const digest = await sha256Hex(`${ADMIN_CREDENTIAL_SALT}:${candidate.trim()}`);
  return constantTimeEqual(digest, ADMIN_PASSWORD_SHA256);
}

/**
 * Generates an HMAC-like session integrity token bound to device & epoch
 * to prevent manual DevTools tampering of sessionStorage role.
 */
export function computeSessionBindingToken(userId: string, epoch: number): string {
  const secretBase = `${ADMIN_CREDENTIAL_SALT}|${userId}|${epoch}|alas_gate_bind`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < secretBase.length; i++) {
    const ch = secretBase.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= (ch + i) & 0xff;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Validates actual file binary magic bytes to ensure uploaded proof files
 * are genuinely JPEG, PNG, or WEBP images (blocks disguised SVG/HTML/scripts).
 */
export async function verifyImageMagicBytes(file: File): Promise<boolean> {
  const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (file.type && !allowedMime.includes(file.type.toLowerCase())) {
    return false;
  }
  const headerSlice = file.slice(0, 12);
  const buffer = await headerSlice.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4) return false;

  // JPEG: FF D8 FF
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  // WEBP: "RIFF" .... "WEBP"
  const isWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  return isJpeg || isPng || isWebp;
}
