const ZONE = 'Europe/Zagreb';

const money = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' });
const number = new Intl.NumberFormat('hr-HR');
const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE, day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/** Calendar parts in Zagreb time (numeric, unpadded day and month). */
function zagrebParts(d) {
  const parts = Object.fromEntries(partsFmt.formatToParts(new Date(d)).map((p) => [p.type, p.value]));
  return { day: Number(parts.day), month: Number(parts.month), year: parts.year, time: `${parts.hour}:${parts.minute}` };
}

export const formatMoney = (cents) => money.format((cents ?? 0) / 100);
export const formatNumber = (n) => number.format(n ?? 0);

/** "2. 11. 2026." */
export function formatDate(d) {
  if (!d) return '—';
  const p = zagrebParts(d);
  return `${p.day}. ${p.month}. ${p.year}.`;
}

/** "2. 11. 2026. 11:00" */
export function formatDateTime(d) {
  if (!d) return '—';
  const p = zagrebParts(d);
  return `${p.day}. ${p.month}. ${p.year}. ${p.time}`;
}

/** "2. 11. 11:00" — for dense lists within the current period. */
export function formatShortDateTime(d) {
  if (!d) return '—';
  const p = zagrebParts(d);
  return `${p.day}. ${p.month}. ${p.time}`;
}

/** "11:00" */
export const formatTime = (d) => (d ? zagrebParts(d).time : '—');

/** "studeni 2026." — month heading for grouped lists. */
const monthFmt = new Intl.DateTimeFormat('hr-HR', { timeZone: ZONE, month: 'long', year: 'numeric' });
export const formatMonth = (d) => {
  const label = monthFmt.format(new Date(d));
  return label.charAt(0).toUpperCase() + label.slice(1);
};
export const monthKey = (d) => {
  const p = zagrebParts(d);
  return `${p.year}-${String(p.month).padStart(2, '0')}`;
};

/** "2026-12-31" (a calendar day) → "31. 12. 2026." without time-zone shifts. */
export function formatDay(isoDay) {
  if (!isoDay) return '—';
  const [y, m, d] = isoDay.split('-').map(Number);
  return `${d}. ${m}. ${y}.`;
}

/** Croatian plural for "bod": 1 bod, 2 boda, 5 bodova, 21 bod, 22 boda. */
export function pointsLabel(n) {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 'bod';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'boda';
  return 'bodova';
}

export const formatPoints = (n) => `${formatNumber(n)} ${pointsLabel(n)}`;

/** Today in Zagreb as "YYYY-MM-DD". */
export function zagrebToday(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(d);
}

export const cx = (...classes) => classes.filter(Boolean).join(' ');

/** 240 → "2,40" (for inputs). */
export const centsToInput = (cents) => ((cents ?? 0) / 100).toFixed(2).replace('.', ',');

/** "2,40" / "2.4" / "2" → 240; returns NaN for invalid input. */
export function parseMoneyInput(value) {
  const normalized = String(value ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  return Math.round(Number(normalized) * 100);
}
