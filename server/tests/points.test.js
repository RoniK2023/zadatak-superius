import { describe, expect, it } from 'vitest';
import { buildEarningRule, calculatePoints, receiptTotalCents } from '../src/domain/points.js';

const items = [
  { quantity: 2, unitPriceCents: 160, pointsPerItem: 1 }, // 2x espresso
  { quantity: 1, unitPriceCents: 250, pointsPerItem: 0 }, // water: no points
  { quantity: 1, unitPriceCents: 420, pointsPerItem: 2 }, // big beer
];
const receipt = { totalCents: receiptTotalCents(items), items };

describe('rule 2 — points calculation', () => {
  it('computes the receipt total from price-list lines', () => {
    expect(receipt.totalCents).toBe(990);
  });

  it('AMOUNT: floor(total * pointsPerEuro)', () => {
    expect(calculatePoints(receipt, { earningMode: 'AMOUNT', pointsPerEuro: 1 })).toBe(9); // 9.90 €
    expect(calculatePoints(receipt, { earningMode: 'AMOUNT', pointsPerEuro: 2 })).toBe(19); // 19.8
    expect(calculatePoints(receipt, { earningMode: 'AMOUNT', pointsPerEuro: 0.5 })).toBe(4); // 4.95
  });

  it('AMOUNT: is not fooled by floating point noise', () => {
    expect(calculatePoints({ totalCents: 435, items: [] }, { earningMode: 'AMOUNT', pointsPerEuro: 100 })).toBe(435);
    expect(calculatePoints({ totalCents: 30, items: [] }, { earningMode: 'AMOUNT', pointsPerEuro: 10 })).toBe(3);
  });

  it('AMOUNT: below one euro earns nothing', () => {
    expect(calculatePoints({ totalCents: 99, items: [] }, { earningMode: 'AMOUNT', pointsPerEuro: 1 })).toBe(0);
  });

  it('ITEM: sum of quantity * pointsPerItem; items with 0 earn nothing', () => {
    expect(calculatePoints(receipt, { earningMode: 'ITEM', pointsPerEuro: 1 })).toBe(2 * 1 + 0 + 1 * 2);
  });

  it('uses the rule passed in (the snapshot), not anything global', () => {
    const amountRule = buildEarningRule({ earningMode: 'AMOUNT', pointsPerEuro: '1.50' });
    expect(amountRule).toEqual({ earningMode: 'AMOUNT', pointsPerEuro: 1.5 });
    expect(calculatePoints(receipt, amountRule)).toBe(14); // 14.85
  });

  it('rejects an unknown mode', () => {
    expect(() => calculatePoints(receipt, { earningMode: 'NOPE' })).toThrow();
  });
});
