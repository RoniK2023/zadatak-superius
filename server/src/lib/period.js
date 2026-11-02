import { DateTime } from 'luxon';
import { ZONE } from '../domain/time.js';
import { badRequest } from './http.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Period filter from the query string: ?from=YYYY-MM-DD&to=YYYY-MM-DD (Zagreb calendar days, inclusive).
 * Defaults to the last 30 days.
 */
export function parsePeriod(query, defaultDays = 30) {
  const today = DateTime.now().setZone(ZONE).startOf('day');
  const parse = (value, fallback) => {
    if (!value) return fallback;
    if (!DAY.test(value)) throw badRequest('Neispravan datum.');
    const d = DateTime.fromISO(value, { zone: ZONE });
    if (!d.isValid) throw badRequest('Neispravan datum.');
    return d.startOf('day');
  };
  const fromDay = parse(query.from, today.minus({ days: defaultDays - 1 }));
  const toDay = parse(query.to, today);
  if (toDay < fromDay) throw badRequest('Datum "do" mora biti nakon datuma "od".');
  return {
    from: fromDay.toJSDate(),
    to: toDay.endOf('day').toJSDate(),
    fromDay: fromDay.toISODate(),
    toDay: toDay.toISODate(),
  };
}
