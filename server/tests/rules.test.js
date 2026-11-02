import { describe, expect, it } from 'vitest';
import { evaluateEarn, evaluateRedeem, REASONS } from '../src/domain/rules.js';
import { isHappyHourAt } from '../src/domain/time.js';

// Monday 2 Nov 2026. Zagreb is UTC+1 in November.
const at = (iso) => new Date(iso);
const MON_10 = at('2026-11-02T10:00:00+01:00');
const MON_17_30 = at('2026-11-02T17:30:00+01:00');
const SAT_17_30 = at('2026-11-07T17:30:00+01:00');

const settings = {
  happyHourEnabled: true,
  happyHourStart: '17:00',
  happyHourEnd: '19:00',
  happyHourDays: [1, 2, 3, 4, 5],
};

const centar = { id: 'loc-centar', programEnabled: true };
const verudela = { id: 'loc-verudela', programEnabled: true };
const waiter = { id: 'w1', locationId: centar.id };

const makeReceipt = (overrides = {}) => ({
  id: 'r1',
  locationId: centar.id,
  paidAt: MON_10,
  isHappyHour: false,
  totalCents: 1250,
  items: [{ quantity: 2, pointsPerItem: 1 }],
  earningRule: { earningMode: 'AMOUNT', pointsPerEuro: 1 },
  ...overrides,
});

const earn = (overrides = {}) =>
  evaluateEarn({
    receipt: makeReceipt(),
    waiter,
    location: centar,
    alreadyAwarded: false,
    settings,
    now: MON_10,
    ...overrides,
  });

describe('earning a receipt', () => {
  it('awards points computed from the receipt rule snapshot', () => {
    expect(earn()).toMatchObject({ ok: true, points: 12 });
    const itemReceipt = makeReceipt({ earningRule: { earningMode: 'ITEM', pointsPerEuro: 1 } });
    expect(earn({ receipt: itemReceipt })).toMatchObject({ ok: true, points: 2, rule: { earningMode: 'ITEM' } });
  });

  it('rule 3 — a receipt that already earned points is rejected', () => {
    expect(earn({ alreadyAwarded: true })).toMatchObject({ ok: false, reason: REASONS.RECEIPT_ALREADY_AWARDED });
  });

  it('rule 4 — a receipt issued during happy hour earns nothing', () => {
    const receipt = makeReceipt({ paidAt: MON_17_30, isHappyHour: true });
    expect(earn({ receipt, now: MON_17_30 })).toMatchObject({ ok: false, reason: REASONS.HAPPY_HOUR });
  });

  it('rule 4 — happy hour is decided by when the receipt was issued, not when it is scanned', () => {
    const receipt = makeReceipt({ paidAt: at('2026-11-02T16:50:00+01:00'), isHappyHour: false });
    expect(earn({ receipt, now: MON_17_30 })).toMatchObject({ ok: true });
  });

  it('rule 5 — a location outside the program cannot earn', () => {
    const off = { ...centar, programEnabled: false };
    expect(earn({ location: off })).toMatchObject({ ok: false, reason: REASONS.LOCATION_NOT_IN_PROGRAM });
  });

  it('rule 9 — a waiter can only award receipts from their own location', () => {
    const receipt = makeReceipt({ locationId: verudela.id });
    expect(earn({ receipt })).toMatchObject({ ok: false, reason: REASONS.RECEIPT_WRONG_LOCATION });
  });

  it("rule 9 — only today's receipts (Europe/Zagreb day) can be awarded", () => {
    const yesterday = makeReceipt({ paidAt: at('2026-11-01T23:30:00+01:00') });
    expect(earn({ receipt: yesterday })).toMatchObject({ ok: false, reason: REASONS.RECEIPT_NOT_TODAY });
    // 00:30 Zagreb time is still "today" although it is the previous day in UTC.
    const earlyToday = makeReceipt({ paidAt: at('2026-11-01T23:30:00Z') });
    expect(earn({ receipt: earlyToday })).toMatchObject({ ok: true });
  });
});

describe('redeeming a reward', () => {
  const reward = { id: 'rw1', pointsCost: 10, active: true };
  const redeem = (overrides = {}) =>
    evaluateRedeem({ balance: 25, reward, location: centar, settings, now: MON_10, ...overrides });

  it('rule 6 — allowed when balance >= pointsCost and returns the new balance', () => {
    expect(redeem()).toEqual({ ok: true, newBalance: 15 });
    expect(redeem({ balance: 10 })).toEqual({ ok: true, newBalance: 0 });
  });

  it('rule 6 — rejected when the guest does not have enough points', () => {
    expect(redeem({ balance: 9 })).toMatchObject({ ok: false, reason: REASONS.INSUFFICIENT_POINTS });
  });

  it('rule 4 — rewards cannot be redeemed while happy hour is active', () => {
    expect(redeem({ now: MON_17_30 })).toMatchObject({ ok: false, reason: REASONS.HAPPY_HOUR });
    expect(redeem({ now: SAT_17_30 })).toMatchObject({ ok: true }); // weekend, no happy hour
    expect(redeem({ now: MON_17_30, settings: { ...settings, happyHourEnabled: false } })).toMatchObject({ ok: true });
  });

  it('rule 5 — a location outside the program cannot redeem', () => {
    expect(redeem({ location: { ...centar, programEnabled: false } })).toMatchObject({
      ok: false,
      reason: REASONS.LOCATION_NOT_IN_PROGRAM,
    });
  });

  it('rejects inactive rewards', () => {
    expect(redeem({ reward: { ...reward, active: false } })).toMatchObject({ ok: false, reason: REASONS.REWARD_INACTIVE });
  });
});

describe('happy hour window', () => {
  it('start inclusive, end exclusive, only on configured days', () => {
    expect(isHappyHourAt(at('2026-11-02T17:00:00+01:00'), settings)).toBe(true);
    expect(isHappyHourAt(at('2026-11-02T18:59:00+01:00'), settings)).toBe(true);
    expect(isHappyHourAt(at('2026-11-02T19:00:00+01:00'), settings)).toBe(false);
    expect(isHappyHourAt(at('2026-11-02T16:59:00+01:00'), settings)).toBe(false);
    expect(isHappyHourAt(SAT_17_30, settings)).toBe(false);
  });

  it('uses Europe/Zagreb local time across DST (summer, UTC+2)', () => {
    // 15:30 UTC on a July Monday is 17:30 in Zagreb.
    expect(isHappyHourAt(at('2026-07-06T15:30:00Z'), settings)).toBe(true);
  });

  it('supports windows that cross midnight (belong to the start day)', () => {
    const late = { ...settings, happyHourStart: '22:00', happyHourEnd: '02:00', happyHourDays: [5] }; // Friday
    expect(isHappyHourAt(at('2026-11-06T23:00:00+01:00'), late)).toBe(true); // Fri 23:00
    expect(isHappyHourAt(at('2026-11-07T01:30:00+01:00'), late)).toBe(true); // Sat 01:30, started Fri
    expect(isHappyHourAt(at('2026-11-08T01:30:00+01:00'), late)).toBe(false); // Sun 01:30, Sat not configured
  });
});
