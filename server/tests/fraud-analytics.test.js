import { describe, expect, it } from 'vitest';
import { detectSuspiciousAttempts, detectSuspiciousEarns } from '../src/domain/fraud.js';
import { aggregateTopGuests, estimateLiability, pointValueCents } from '../src/domain/analytics.js';

const t = (iso) => new Date(iso);

describe('rule 10 — suspicious activity', () => {
  it('flags a guest earning more often than the daily limit', () => {
    const earns = [1, 2, 3, 4].map((i) => ({
      id: `e${i}`, guestProfileId: 'g1', waiterId: `w${i}`, createdAt: t(`2026-11-02T0${i}:00:00+01:00`),
    }));
    const flags = detectSuspiciousEarns(earns, { dailyScanLimitPerGuest: 3 });
    expect(flags.get('e1')).toContain('GUEST_DAILY_LIMIT');
    expect(detectSuspiciousEarns(earns.slice(0, 3), { dailyScanLimitPerGuest: 3 }).size).toBe(0);
  });

  it('flags the same waiter awarding the same guest more than twice a day', () => {
    const earns = [9, 10, 11].map((h) => ({
      id: `e${h}`, guestProfileId: 'g1', waiterId: 'w1', createdAt: t(`2026-11-02T${String(h).padStart(2, '0')}:00:00+01:00`),
    }));
    const flags = detectSuspiciousEarns(earns, { dailyScanLimitPerGuest: 10 });
    expect(flags.get('e9')).toEqual(['WAITER_GUEST_DAILY']);
  });

  it('flags more than 10 awards from one waiter to one guest within 30 days', () => {
    const earns = Array.from({ length: 11 }, (_, i) => ({
      id: `e${i}`, guestProfileId: 'g1', waiterId: 'w1', createdAt: new Date(t('2026-10-01T10:00:00+02:00').getTime() + i * 2 * 86400000),
    }));
    const flags = detectSuspiciousEarns(earns, { dailyScanLimitPerGuest: 10 });
    expect(flags.get('e0')).toContain('WAITER_GUEST_30D');
    expect(detectSuspiciousEarns(earns.slice(0, 10), { dailyScanLimitPerGuest: 10 }).size).toBe(0);
  });

  it('flags bursts of rejected attempts', () => {
    const attempts = [1, 2, 3].map((i) => ({ id: `a${i}`, waiterId: 'w1', guestProfileId: 'g1', createdAt: t(`2026-11-02T1${i}:00:00+01:00`) }));
    expect(detectSuspiciousAttempts(attempts).get('a1')).toEqual(['REJECTED_BURST']);
    expect(detectSuspiciousAttempts(attempts.slice(0, 2)).size).toBe(0);
  });
});

describe('owner analytics', () => {
  const rewards = [
    { active: true, pointsCost: 10, costPriceCents: 30 },
    { active: true, pointsCost: 15, costPriceCents: 60 },
    { active: false, pointsCost: 10, costPriceCents: 1 },
  ];

  it('liability uses the cheapest active reward per point', () => {
    expect(pointValueCents(rewards)).toBe(3);
    expect(estimateLiability(500, rewards)).toEqual({ points: 500, perPointCents: 3, valueCents: 1500 });
    expect(estimateLiability(500, []).valueCents).toBe(0);
  });

  it('aggregates top guests by spending', () => {
    const earns = [
      { guestProfileId: 'a', locationId: 'L1', createdAt: t('2026-10-01'), receipt: { totalCents: 500 } },
      { guestProfileId: 'a', locationId: 'L2', createdAt: t('2026-10-03'), receipt: { totalCents: 300 } },
      { guestProfileId: 'a', locationId: 'L2', createdAt: t('2026-10-02'), receipt: { totalCents: 300 } },
      { guestProfileId: 'b', locationId: 'L1', createdAt: t('2026-10-05'), receipt: { totalCents: 2000 } },
    ];
    const [first, second] = aggregateTopGuests(earns);
    expect(first).toMatchObject({ guestProfileId: 'b', spendingCents: 2000, visits: 1 });
    expect(second).toMatchObject({ guestProfileId: 'a', spendingCents: 1100, visits: 3, topLocationId: 'L2' });
    expect(second.lastVisitAt).toEqual(t('2026-10-03'));
  });
});
