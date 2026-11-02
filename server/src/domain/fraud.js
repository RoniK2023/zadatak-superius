import { zagrebDayKey } from './time.js';

/**
 * Suspicious activity detection (business rule 10). Pure — works on plain rows.
 *
 * Thresholds (documented in README "Tehničke odluke"):
 *  - GUEST_DAILY_LIMIT: guest earns more than `dailyScanLimitPerGuest` times in one day (owner setting).
 *  - WAITER_GUEST_DAILY: the same waiter awards the same guest more than 2 times in one day.
 *  - WAITER_GUEST_30D:  the same waiter awards the same guest more than 10 times in 30 days.
 *  - REJECTED_BURST:    3 or more rejected attempts by the same waiter for the same guest in one day.
 */
export const FRAUD_THRESHOLDS = {
  waiterGuestPerDay: 2,
  waiterGuestPer30Days: 10,
  windowDays: 30,
  rejectedPerDay: 3,
};

export const FLAG_LABELS = {
  GUEST_DAILY_LIMIT: 'Gost bodovan više puta dnevno nego što je dopušteno',
  WAITER_GUEST_DAILY: 'Isti konobar bodovao istog gosta više od 2 puta u danu',
  WAITER_GUEST_30D: 'Isti konobar bodovao istog gosta više od 10 puta u 30 dana',
  REJECTED_BURST: 'Ponovljeni odbijeni pokušaji',
};

const DAY_MS = 24 * 60 * 60 * 1000;

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
  const byWaiterGuest = new Map();

  for (const tx of earns) {
    const day = zagrebDayKey(tx.createdAt);
    const gd = `${tx.guestProfileId}|${day}`;
    byGuestDay.set(gd, [...(byGuestDay.get(gd) ?? []), tx]);
    if (tx.waiterId) {
      const wgd = `${tx.waiterId}|${tx.guestProfileId}|${day}`;
      byWaiterGuestDay.set(wgd, [...(byWaiterGuestDay.get(wgd) ?? []), tx]);
      const wg = `${tx.waiterId}|${tx.guestProfileId}`;
      byWaiterGuest.set(wg, [...(byWaiterGuest.get(wg) ?? []), tx]);
    }
  }

  const limit = settings?.dailyScanLimitPerGuest ?? 3;
  for (const group of byGuestDay.values()) {
    if (group.length > limit) group.forEach((tx) => addFlag(flags, tx.id, 'GUEST_DAILY_LIMIT'));
  }
  for (const group of byWaiterGuestDay.values()) {
    if (group.length > thresholds.waiterGuestPerDay) group.forEach((tx) => addFlag(flags, tx.id, 'WAITER_GUEST_DAILY'));
  }
  // Rolling 30-day window per waiter+guest pair (two pointers over sorted times).
  const windowMs = thresholds.windowDays * DAY_MS;
  for (const group of byWaiterGuest.values()) {
    const sorted = [...group].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let start = 0;
    for (let end = 0; end < sorted.length; end += 1) {
      while (new Date(sorted[end].createdAt) - new Date(sorted[start].createdAt) > windowMs) start += 1;
      if (end - start + 1 > thresholds.waiterGuestPer30Days) {
        for (let i = start; i <= end; i += 1) addFlag(flags, sorted[i].id, 'WAITER_GUEST_30D');
      }
    }
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
