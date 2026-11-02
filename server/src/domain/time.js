import { DateTime } from 'luxon';

/** All business rules (happy hour, "today", expiry) run in this time zone. */
export const ZONE = 'Europe/Zagreb';

export function toZoned(date) {
  const d = date instanceof Date ? date : new Date(date);
  return DateTime.fromJSDate(d, { zone: ZONE });
}

export function isSameZagrebDay(a, b) {
  return toZoned(a).hasSame(toZoned(b), 'day');
}

export function startOfZagrebDay(date) {
  return toZoned(date).startOf('day').toJSDate();
}

export function endOfZagrebDay(date) {
  return toZoned(date).endOf('day').toJSDate();
}

/** Calendar day key in Zagreb, e.g. "2026-11-02". */
export function zagrebDayKey(date) {
  return toZoned(date).toISODate();
}

export function addMonths(date, months) {
  return toZoned(date).plus({ months }).toJSDate();
}

/** "17:30" -> 1050 (minutes since midnight). Returns null for invalid input. */
export function parseHHMM(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value ?? ''));
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Is `date` inside the happy hour window?
 * Days are ISO weekdays (1 = Monday … 7 = Sunday). A window that crosses midnight
 * (e.g. 22:00–02:00) belongs to the day on which it starts.
 */
export function isHappyHourAt(date, settings) {
  if (!settings?.happyHourEnabled) return false;
  const start = parseHHMM(settings.happyHourStart);
  const end = parseHHMM(settings.happyHourEnd);
  const days = settings.happyHourDays ?? [];
  if (start === null || end === null || start === end || days.length === 0) return false;

  const z = toZoned(date);
  const minutes = z.hour * 60 + z.minute;

  if (start < end) {
    return days.includes(z.weekday) && minutes >= start && minutes < end;
  }
  // Overnight window
  if (minutes >= start) return days.includes(z.weekday);
  if (minutes < end) return days.includes(z.minus({ days: 1 }).weekday);
  return false;
}
