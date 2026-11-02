import { randomInt } from 'node:crypto';

// Crockford-style alphabet without ambiguous characters (no I, L, O, U, 0, 1).
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 12; // 30^12 ≈ 5.3e17 combinations — unguessable for this use case

/** Random, unguessable guest QR code, e.g. "K7M2-QX9P-4TRA". Not derived from the user id. */
export function generateQrToken() {
  let raw = '';
  for (let i = 0; i < LENGTH; i += 1) raw += ALPHABET[randomInt(ALPHABET.length)];
  return raw.match(/.{4}/g).join('-');
}

/** Normalises manual input: "k7m2 qx9p 4tra" -> "K7M2-QX9P-4TRA". */
export function normalizeQrToken(input) {
  const raw = String(input ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (raw.length !== LENGTH) return raw;
  return raw.match(/.{4}/g).join('-');
}
