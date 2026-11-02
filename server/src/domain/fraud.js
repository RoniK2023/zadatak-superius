import { zagrebDayKey } from './time.js';

/**
 * Suspicious activity detection (business rule 10). Pure — works on plain rows.
 *
 * Thresholds (documented in README "Tehničke odluke"):
 *  - GUEST_DAILY_LIMIT: guest earns more than `dailyScanLimitPerGuest` times in one day (owner setting).
 *  - WAITER_GUEST_DAILY: the same waiter awards the same guest more than 2 times in one day.
 *  - REJECTED_BURST:    3 or more rejected attempts by the same waiter for the same guest in one day.
 */
export const FRAUD_THRESHOLDS = {
  waiterGuestPerDay: 2,
  rejectedPerDay: 3,
  // How far back the owner views look for patterns that start before the selected period.
  windowDays: 1,
};

export const FLAG_LABELS = {
  GUEST_DAILY_LIMIT: 'Gost bodovan više puta dnevno nego što je dopušteno',
  WAITER_GUEST_DAILY: 'Isti konobar bodovao istog gosta više od 2 puta u danu',
  REJECTED_BURST: 'Ponovljeni odbijeni pokušaji',
};

function addFlag(map, id, flag) {
  const list = map.get(id) ?? [];
  if (!list.includes(flag)) list.push(flag);
  map.set(id, list);
}

/**
 * @param {{ id: string, guestProfileId: string, waiterId: string|null, createdAt: Date }[]} earns
 * @param {{ dailyScanLimitPerGuest: number }} settings
 * @returns {Map<string, string[]>} transaction id -> flags
 */
export function detectSuspiciousEarns(earns, settings, thresholds = FRAUD_THRESHOLDS) {
  const flags = new Map();
  const byGuestDay = new Map();
  const byWaiterGuestDay = new Map();

  for (const tx of earns) {
    const day = zagrebDayKey(tx.createdAt);
    const gd = `${tx.guestProfileId}|${day}`;
    byGuestDay.set(gd, [...(byGuestDay.get(gd) ?? []), tx]);
    if (tx.waiterId) {
      const wgd = `${tx.waiterId}|${tx.guestProfileId}|${day}`;
      byWaiterGuestDay.set(wgd, [...(byWaiterGuestDay.get(wgd) ?? []), tx]);
    }
  }

  const limit = settings?.dailyScanLimitPerGuest ?? 3;
  for (const group of byGuestDay.values()) {
    if (group.length > limit) group.forEach((tx) => addFlag(flags, tx.id, 'GUEST_DAILY_LIMIT'));
  }
  for (const group of byWaiterGuestDay.values()) {
    if (group.length > thresholds.waiterGuestPerDay) group.forEach((tx) => addFlag(flags, tx.id, 'WAITER_GUEST_DAILY'));
  }
  return flags;
}

/**
 * @param {{ id: string, waiterId: string, guestProfileId: string|null, createdAt: Date }[]} attempts
 * @returns {Map<string, string[]>} attempt id -> flags
 */
export function detectSuspiciousAttempts(attempts, thresholds = FRAUD_THRESHOLDS) {
  const flags = new Map();
  const groups = new Map();
  for (const a of attempts) {
    const key = `${a.waiterId}|${a.guestProfileId ?? '-'}|${zagrebDayKey(a.createdAt)}`;
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  for (const group of groups.values()) {
    if (group.length >= thresholds.rejectedPerDay) group.forEach((a) => addFlag(flags, a.id, 'REJECTED_BURST'));
  }
  return flags;
}
