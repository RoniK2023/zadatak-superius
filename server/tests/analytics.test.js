import { describe, expect, it } from 'vitest';
import { aggregateTopGuests, estimateLiability, pointValueCents } from '../src/domain/analytics.js';

const t = (iso) => new Date(iso);

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
