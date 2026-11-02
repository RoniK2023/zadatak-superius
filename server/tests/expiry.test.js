import { describe, expect, it } from 'vitest';
import { computeExpiryDeadline, evaluateExpiry, expirySettingsChanged, lastValidDay } from '../src/domain/expiry.js';

const d = (iso) => new Date(iso);

const baseProfile = {
  balance: 40,
  createdAt: d('2025-01-10T10:00:00+01:00'),
  lastActivityAt: d('2025-06-01T12:00:00+02:00'),
  lastResetAt: d('2025-01-10T10:00:00+01:00'),
};

describe('rule 7 — INACTIVITY expiry', () => {
  const settings = {
    expiryMode: 'INACTIVITY',
    expiryInactivityMonths: 12,
    expirySettingsChangedAt: d('2025-01-01T00:00:00+01:00'),
  };

  it('deadline = max(lastActivityAt, expirySettingsChangedAt) + N months', () => {
    expect(computeExpiryDeadline(baseProfile, settings)).toEqual(d('2026-06-01T12:00:00+02:00'));
  });

  it('README edge case: 40 points reset to 0 after 12 months without a visit', () => {
    const before = evaluateExpiry(baseProfile, settings, d('2026-05-31T12:00:00+02:00'));
    expect(before.expired).toBe(false);
    const after = evaluateExpiry(baseProfile, settings, d('2026-06-01T12:00:00+02:00'));
    expect(after).toMatchObject({ expired: true, expiredPoints: 40, update: { balance: 0 } });
    expect(after.update.lastResetAt).toEqual(d('2026-06-01T12:00:00+02:00'));
  });

  it('a visit with points restarts the countdown', () => {
    const visited = { ...baseProfile, lastActivityAt: d('2026-05-20T09:00:00+02:00') };
    expect(evaluateExpiry(visited, settings, d('2026-06-10T00:00:00+02:00')).expired).toBe(false);
    expect(computeExpiryDeadline(visited, settings)).toEqual(d('2027-05-20T09:00:00+02:00'));
  });

  it('README edge case: shortening expiry does not wipe points immediately', () => {
    const changedAt = d('2026-03-01T10:00:00+01:00');
    const shortened = { ...settings, expiryInactivityMonths: 3, expirySettingsChangedAt: changedAt };
    // Last activity was 9 months before the change — under the new rule alone it would have expired already.
    expect(evaluateExpiry(baseProfile, shortened, d('2026-03-01T10:00:01+01:00')).expired).toBe(false);
    expect(computeExpiryDeadline(baseProfile, shortened)).toEqual(d('2026-06-01T10:00:00+02:00'));
  });

  it('a guest who never earned counts from profile creation', () => {
    const fresh = { ...baseProfile, lastActivityAt: null, balance: 0 };
    expect(computeExpiryDeadline(fresh, settings)).toEqual(d('2026-01-10T10:00:00+01:00'));
  });
});

describe('rule 7 — FIXED_DATE expiry', () => {
  const settings = {
    expiryMode: 'FIXED_DATE',
    expiryDay: 31,
    expiryMonth: 12,
    expirySettingsChangedAt: d('2025-01-01T00:00:00+01:00'),
  };

  it('resets after the first 31.12. following max(lastResetAt, changedAt); valid through that day', () => {
    const deadline = computeExpiryDeadline(baseProfile, settings);
    expect(deadline).toEqual(d('2026-01-01T00:00:00+01:00'));
    expect(lastValidDay(deadline)).toBe('2025-12-31');
    expect(evaluateExpiry(baseProfile, settings, d('2025-12-31T23:59:00+01:00')).expired).toBe(false);
    expect(evaluateExpiry(baseProfile, settings, d('2026-01-01T00:00:00+01:00')).expired).toBe(true);
  });

  it('after a reset the next deadline moves to the following year', () => {
    const reset = { ...baseProfile, lastResetAt: d('2026-01-03T09:00:00+01:00') };
    expect(computeExpiryDeadline(reset, settings)).toEqual(d('2027-01-01T00:00:00+01:00'));
  });

  it('changing the settings restarts the count from the change', () => {
    const changed = { ...settings, expiryDay: 30, expiryMonth: 6, expirySettingsChangedAt: d('2025-07-15T00:00:00+02:00') };
    expect(computeExpiryDeadline(baseProfile, changed)).toEqual(d('2026-07-01T00:00:00+02:00'));
  });

  it('clamps 29.2. to 28.2. in non-leap years', () => {
    const feb = { ...settings, expiryDay: 29, expiryMonth: 2 };
    expect(lastValidDay(computeExpiryDeadline(baseProfile, feb))).toBe('2025-02-28');
  });
});

describe('rule 7 — PERIOD expiry', () => {
  const settings = {
    expiryMode: 'PERIOD',
    expiryPeriodMonths: 6,
    programStartAt: d('2024-03-01T00:00:00+01:00'),
    expirySettingsChangedAt: d('2024-03-01T00:00:00+01:00'),
  };

  it('deadline is the first programStart + k*period after max(lastResetAt, changedAt)', () => {
    // Boundaries: 2024-09-01, 2025-03-01, 2025-09-01 … lastResetAt is 2025-01-10.
    expect(computeExpiryDeadline(baseProfile, settings)).toEqual(d('2025-03-01T00:00:00+01:00'));
    const reset = { ...baseProfile, lastResetAt: d('2025-03-01T08:00:00+01:00') };
    expect(computeExpiryDeadline(reset, settings)).toEqual(d('2025-09-01T00:00:00+02:00'));
  });

  it('a boundary exactly at the base moves to the next one', () => {
    const reset = { ...baseProfile, lastResetAt: d('2025-09-01T00:00:00+02:00') };
    expect(computeExpiryDeadline(reset, settings)).toEqual(d('2026-03-01T00:00:00+01:00'));
  });
});

describe('expiry misc', () => {
  it('no deadline when the configuration is incomplete', () => {
    expect(computeExpiryDeadline(baseProfile, { expiryMode: 'INACTIVITY', expiryInactivityMonths: null })).toBeNull();
    expect(evaluateExpiry(baseProfile, { expiryMode: 'FIXED_DATE' }).expired).toBe(false);
  });

  it('detects expiry setting changes', () => {
    const before = { expiryMode: 'INACTIVITY', expiryInactivityMonths: 12, programStartAt: d('2025-01-01') };
    expect(expirySettingsChanged(before, { ...before })).toBe(false);
    expect(expirySettingsChanged(before, { ...before, expiryInactivityMonths: 6 })).toBe(true);
    expect(expirySettingsChanged(before, { ...before, expiryMode: 'PERIOD' })).toBe(true);
  });
});
