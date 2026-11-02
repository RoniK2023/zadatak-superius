import { calculatePoints } from './points.js';
import { isHappyHourAt, isSameZagrebDay } from './time.js';

/** Reasons for rejected earn / redeem attempts (stored in ScanAttempt.reason). */
export const REASONS = {
  RECEIPT_ALREADY_AWARDED: 'RECEIPT_ALREADY_AWARDED',
  HAPPY_HOUR: 'HAPPY_HOUR',
  LOCATION_NOT_IN_PROGRAM: 'LOCATION_NOT_IN_PROGRAM',
  INSUFFICIENT_POINTS: 'INSUFFICIENT_POINTS',
  RECEIPT_WRONG_LOCATION: 'RECEIPT_WRONG_LOCATION',
  RECEIPT_NOT_TODAY: 'RECEIPT_NOT_TODAY',
  REWARD_INACTIVE: 'REWARD_INACTIVE',
  GUEST_NOT_FOUND: 'GUEST_NOT_FOUND',
};

export const REASON_MESSAGES = {
  RECEIPT_ALREADY_AWARDED: 'Ovaj račun je već bodovan. Jedan račun može dobiti bodove samo jednom.',
  HAPPY_HOUR: 'Happy hour je u tijeku — bodovi se ne dodjeljuju i nagrade se ne mogu iskoristiti.',
  LOCATION_NOT_IN_PROGRAM: 'Ova lokacija nije uključena u program vjernosti.',
  INSUFFICIENT_POINTS: 'Gost nema dovoljno bodova za ovu nagradu.',
  RECEIPT_WRONG_LOCATION: 'Račun nije izdan na vašoj lokaciji.',
  RECEIPT_NOT_TODAY: 'Mogu se bodovati samo današnji računi.',
  REWARD_INACTIVE: 'Nagrada više nije aktivna.',
  GUEST_NOT_FOUND: 'Gost s ovim kodom ne postoji.',
};

const reject = (reason) => ({ ok: false, reason, message: REASON_MESSAGES[reason] });

/**
 * Can this receipt earn points? (rules 2, 3, 4, 5, 9)
 * The happy-hour check uses the time the receipt was issued (receipt.isHappyHour,
 * or recomputed from paidAt when settings are provided).
 */
export function evaluateEarn({ receipt, waiter, location, alreadyAwarded, settings, now = new Date() }) {
  if (!location.programEnabled) return reject(REASONS.LOCATION_NOT_IN_PROGRAM);
  if (receipt.locationId !== waiter.locationId) return reject(REASONS.RECEIPT_WRONG_LOCATION);
  if (!isSameZagrebDay(receipt.paidAt, now)) return reject(REASONS.RECEIPT_NOT_TODAY);
  if (alreadyAwarded) return reject(REASONS.RECEIPT_ALREADY_AWARDED);

  const issuedInHappyHour = receipt.isHappyHour ?? (settings ? isHappyHourAt(receipt.paidAt, settings) : false);
  if (issuedInHappyHour) return reject(REASONS.HAPPY_HOUR);

  const rule = receipt.earningRule;
  const points = calculatePoints(receipt, rule);
  return { ok: true, points, rule };
}

/** Can the guest redeem this reward right now? (rules 4, 5, 6) */
export function evaluateRedeem({ balance, reward, location, settings, now = new Date() }) {
  if (!location.programEnabled) return reject(REASONS.LOCATION_NOT_IN_PROGRAM);
  if (isHappyHourAt(now, settings)) return reject(REASONS.HAPPY_HOUR);
  if (!reward.active) return reject(REASONS.REWARD_INACTIVE);
  if (balance < reward.pointsCost) return reject(REASONS.INSUFFICIENT_POINTS);
  return { ok: true, newBalance: balance - reward.pointsCost };
}
