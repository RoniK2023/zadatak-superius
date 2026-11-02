const ZONE = 'Europe/Zagreb';

const money = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' });
const number = new Intl.NumberFormat('hr-HR');
const dateFmt = new Intl.DateTimeFormat('hr-HR', { timeZone: ZONE, day: 'numeric', month: 'numeric', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('hr-HR', {
  timeZone: ZONE, day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('hr-HR', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' });
const shortDateTimeFmt = new Intl.DateTimeFormat('hr-HR', {
  timeZone: ZONE, day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
});

export const formatMoney = (cents) => money.format((cents ?? 0) / 100);
export const formatNumber = (n) => number.format(n ?? 0);
export const formatDate = (d) => (d ? dateFmt.format(new Date(d)) : '—');
export const formatDateTime = (d) => (d ? dateTimeFmt.format(new Date(d)) : '—');
export const formatShortDateTime = (d) => (d ? shortDateTimeFmt.format(new Date(d)) : '—');
export const formatTime = (d) => (d ? timeFmt.format(new Date(d)) : '—');

/** "2026-12-31" (a calendar day) → "31. 12. 2026." without time-zone shifts. */
export function formatDay(isoDay) {
  if (!isoDay) return '—';
  const [y, m, d] = isoDay.split('-').map(Number);
  return dateFmt.format(new Date(Date.UTC(y, m - 1, d, 12)));
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
