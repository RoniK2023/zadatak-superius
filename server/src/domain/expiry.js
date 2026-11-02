import { DateTime } from 'luxon';
import { ZONE, toZoned } from './time.js';

/**
 * Points expiry (business rule 7). All of a guest's points reset to 0 at once.
 *
 *  INACTIVITY: max(lastActivityAt, expirySettingsChangedAt) + expiryInactivityMonths
 *  FIXED_DATE: first expiryDay.expiryMonth after max(lastResetAt, expirySettingsChangedAt);
 *              points are valid through that whole day, so the deadline is 00:00 the next day.
 *  PERIOD:     first boundary programStartAt + k * expiryPeriodMonths (k >= 1)
 *              after max(lastResetAt, expirySettingsChangedAt)
 *
 * A guest who has never earned / never been reset falls back to profile creation time.
 */

const maxDate = (...dates) =>
  new Date(Math.max(...dates.filter(Boolean).map((d) => new Date(d).getTime())));

function fixedDateDeadline(base, day, month) {
  const b = toZoned(base);
  for (let year = b.year; year <= b.year + 2; year += 1) {
    const monthStart = DateTime.fromObject({ year, month, day: 1 }, { zone: ZONE });
    const clampedDay = Math.min(day, monthStart.daysInMonth);
    const deadline = monthStart.set({ day: clampedDay }).plus({ days: 1 }).startOf('day');
    if (deadline > b) return deadline.toJSDate();
  }
  return null;
}

function periodDeadline(base, programStartAt, periodMonths) {
  const start = toZoned(programStartAt);
  const b = toZoned(base);
  // Jump close to the answer, then step (always computed from the start to avoid day drift).
  const monthsApart = Math.max(0, (b.year - start.year) * 12 + (b.month - start.month));
  let k = Math.max(1, Math.floor(monthsApart / periodMonths));
  for (let i = 0; i < 1000; i += 1, k += 1) {
    const boundary = start.plus({ months: k * periodMonths });
    if (boundary > b) return boundary.toJSDate();
  }
  return null;
}

/** Returns the instant at which the guest's points reset to 0, or null if no expiry applies. */
export function computeExpiryDeadline(profile, settings) {
  const changedAt = settings.expirySettingsChangedAt;

  switch (settings.expiryMode) {
    case 'INACTIVITY': {
      const months = settings.expiryInactivityMonths;
      if (!months || months <= 0) return null;
      const base = maxDate(profile.lastActivityAt ?? profile.createdAt, changedAt);
      return toZoned(base).plus({ months }).toJSDate();
    }
    case 'FIXED_DATE': {
      const { expiryDay: day, expiryMonth: month } = settings;
      if (!day || !month || month < 1 || month > 12 || day < 1 || day > 31) return null;
      const base = maxDate(profile.lastResetAt ?? profile.createdAt, changedAt);
      return fixedDateDeadline(base, day, month);
    }
    case 'PERIOD': {
      const months = settings.expiryPeriodMonths;
      if (!months || months <= 0 || !settings.programStartAt) return null;
      const base = maxDate(profile.lastResetAt ?? profile.createdAt, changedAt);
      return periodDeadline(base, settings.programStartAt, months);
    }
    default:
      return null;
  }
}

/** Last calendar day (Zagreb, "YYYY-MM-DD") on which points are still valid. */
export function lastValidDay(deadline) {
  if (!deadline) return null;
  return toZoned(new Date(deadline.getTime() - 1)).toISODate();
}

/**
 * Lazy expiry check — pure. The caller persists the result.
 * @returns {{ expired: boolean, expiredPoints: number, deadline: Date | null,
 *            update?: { balance: number, lastResetAt: Date } }}
 */
export function evaluateExpiry(profile, settings, now = new Date()) {
  const deadline = computeExpiryDeadline(profile, settings);
  if (!deadline || now < deadline) {
    return { expired: false, expiredPoints: 0, deadline };
  }
  return {
    expired: true,
    expiredPoints: Math.max(0, profile.balance),
    deadline,
    update: { balance: 0, lastResetAt: now },
  };
}

/** Did any of the expiry settings change? (Then expirySettingsChangedAt must be bumped.) */
export function expirySettingsChanged(before, after) {
  const keys = ['expiryMode', 'expiryDay', 'expiryMonth', 'expiryPeriodMonths', 'expiryInactivityMonths'];
  if (keys.some((k) => (before[k] ?? null) !== (after[k] ?? null))) return true;
  const t = (d) => (d ? new Date(d).getTime() : null);
  return t(before.programStartAt) !== t(after.programStartAt);
}
