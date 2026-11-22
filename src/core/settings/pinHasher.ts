/**
 * Salted SHA-256 hashing for the parental-controls PIN (port of Android
 * `PinHasher.kt`). Same encoding — salt = 16 random bytes as lowercase hex,
 * hash = hex(SHA-256(utf8("<salt>:<pin>"))) — so a backup's stored PIN hash
 * verifies on either platform. Web Crypto digests are asynchronous.
 */
const SALT_BYTES = 16;

export type RandomBytes = (length: number) => Uint8Array;

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const defaultRandom: RandomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));

export function newSalt(random: RandomBytes = defaultRandom): string {
  return toHex(random(SALT_BYTES));
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`));
  return toHex(new Uint8Array(digest));
}

export async function pinMatches(pin: string, salt: string, expectedHash: string): Promise<boolean> {
  return expectedHash !== '' && (await hashPin(pin, salt)) === expectedHash;
}
