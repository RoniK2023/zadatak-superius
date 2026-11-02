/**
 * Loyalty orchestration: loads data, calls the pure domain rules, persists results.
 * Business decisions live in src/domain — this file only does I/O and transactions.
 */
import { prisma } from '../db.js';
import { HttpError, notFound } from '../lib/http.js';
import { normalizeQrToken } from '../lib/token.js';
import { computeExpiryDeadline, evaluateExpiry, lastValidDay } from '../domain/expiry.js';
import { REASON_MESSAGES, REASONS, evaluateEarn, evaluateRedeem } from '../domain/rules.js';
import { isHappyHourAt } from '../domain/time.js';

/** A rejected earn/redeem attempt — returned to the client as 422 with the reason code. */
export class RuleRejection extends HttpError {
  constructor(reason, extra = {}) {
    super(422, reason, REASON_MESSAGES[reason] ?? 'Radnja je odbijena.', extra);
    this.reason = reason;
  }
}

export async function getSettings(tenantId, db = prisma) {
  const settings = await db.programSettings.findUnique({ where: { tenantId } });
  if (!settings) throw new HttpError(500, 'NO_SETTINGS', 'Program nije konfiguriran.');
  return settings;
}

/** Lock the guest row for the rest of the transaction (serialises earn/redeem/expiry per guest). */
async function lockGuest(tx, profileId) {
  await tx.$queryRaw`SELECT id FROM "GuestProfile" WHERE id = ${profileId} FOR UPDATE`;
  return tx.guestProfile.findUnique({ where: { id: profileId } });
}

/**
 * Lazy expiry (rule 7): checks and applies expiry when a guest is loaded or scanned.
 * Creates an EXPIRE transaction with the negative balance and sets lastResetAt.
 */
export async function refreshGuest(profileId, settings, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const profile = await lockGuest(tx, profileId);
    const result = evaluateExpiry(profile, settings, now);
    if (!result.expired) return { profile, expiredPoints: 0 };

    const updated = await tx.guestProfile.update({ where: { id: profile.id }, data: result.update });
    if (result.expiredPoints > 0) {
      await tx.pointTransaction.create({
        data: {
          tenantId: profile.tenantId,
          type: 'EXPIRE',
          guestProfileId: profile.id,
          points: -result.expiredPoints,
          ruleSnapshot: { expiryMode: settings.expiryMode, deadline: result.deadline },
          createdAt: now,
        },
      });
    }
    return { profile: updated, expiredPoints: result.expiredPoints };
  });
}

/** Expiry info for display. With 0 points nothing can expire. */
export function expiryInfo(profile, settings) {
  if (profile.balance <= 0) return { expiresAt: null, expiresOn: null };
  const deadline = computeExpiryDeadline(profile, settings);
  return { expiresAt: deadline, expiresOn: lastValidDay(deadline) };
}

async function logAttempt(data) {
  try {
    await prisma.scanAttempt.create({ data });
  } catch (err) {
    console.error('Failed to log scan attempt', err);
  }
}

async function findGuestByToken(tenantId, qrToken) {
  const token = normalizeQrToken(qrToken);
  if (!token) return null;
  return prisma.guestProfile.findFirst({
    where: { tenantId, qrToken: token, user: { active: true } },
    include: { user: { select: { name: true } } },
  });
}

async function requireWaiterLocation(waiter) {
  const location = await prisma.location.findFirst({ where: { id: waiter.locationId, tenantId: waiter.tenantId } });
  if (!location) throw new HttpError(403, 'FORBIDDEN', 'Konobar nije vezan uz lokaciju.');
  return location;
}

/** Shared "what can this guest do here" payload for the waiter screens. */
async function guestSnapshot(profile, name, settings, location, now) {
  const rewards = await prisma.reward.findMany({
    where: { tenantId: profile.tenantId, active: true },
    orderBy: { pointsCost: 'asc' },
  });
  const happyHourActive = isHappyHourAt(now, settings);
  return {
    guest: { id: profile.id, name, balance: profile.balance, ...expiryInfo(profile, settings) },
    status: { happyHourActive, locationEnabled: location.programEnabled },
    rewards: rewards.map((r) => {
      const verdict = evaluateRedeem({ balance: profile.balance, reward: r, location, settings, now });
      return {
        id: r.id,
        name: r.name,
        pointsCost: r.pointsCost,
        missing: Math.max(0, r.pointsCost - profile.balance),
        canRedeem: verdict.ok,
        blockedReason: verdict.ok ? null : verdict.reason,
      };
    }),
  };
}

/** Waiter scans a guest (redeem screen). Applies lazy expiry. */
export async function lookupGuest(waiter, qrToken, now = new Date()) {
  const settings = await getSettings(waiter.tenantId);
  const location = await requireWaiterLocation(waiter);
  const found = await findGuestByToken(waiter.tenantId, qrToken);
  if (!found) throw new RuleRejection(REASONS.GUEST_NOT_FOUND);
  const { profile, expiredPoints } = await refreshGuest(found.id, settings, now);
  return { ...(await guestSnapshot(profile, found.user.name, settings, location, now)), expiredPoints };
}

/** Award points for a receipt (rules 1–5, 7, 8, 9). */
export async function awardPoints(waiter, { receiptId, qrToken }, now = new Date()) {
  const settings = await getSettings(waiter.tenantId);
  const location = await requireWaiterLocation(waiter);
  const base = { tenantId: waiter.tenantId, action: 'EARN', waiterId: waiter.id, locationId: location.id };

  const receipt = await prisma.receipt.findFirst({
    where: { id: receiptId, tenantId: waiter.tenantId },
    include: { items: true, earnTransaction: { select: { id: true } } },
  });
  if (!receipt) throw notFound('Račun nije pronađen.');

  const guest = await findGuestByToken(waiter.tenantId, qrToken);
  if (!guest) {
    await logAttempt({ ...base, reason: REASONS.GUEST_NOT_FOUND, receiptId: receipt.id });
    throw new RuleRejection(REASONS.GUEST_NOT_FOUND);
  }

  const reject = async (reason) => {
    await logAttempt({ ...base, reason, guestProfileId: guest.id, receiptId: receipt.id });
    throw new RuleRejection(reason, { guestName: guest.user.name, receiptNumber: receipt.number });
  };

  const verdict = evaluateEarn({
    receipt,
    waiter,
    location,
    alreadyAwarded: Boolean(receipt.earnTransaction),
    settings,
    now,
  });
  if (!verdict.ok) await reject(verdict.reason);

  const { expiredPoints } = await refreshGuest(guest.id, settings, now);

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      await lockGuest(tx, guest.id);
      await tx.pointTransaction.create({
        data: {
          tenantId: waiter.tenantId,
          type: 'EARN',
          guestProfileId: guest.id,
          points: verdict.points,
          receiptId: receipt.id,
          waiterId: waiter.id,
          locationId: location.id,
          ruleSnapshot: verdict.rule,
          createdAt: now,
        },
      });
      return tx.guestProfile.update({
        where: { id: guest.id },
        data: { balance: { increment: verdict.points }, lastActivityAt: now },
      });
    });
  } catch (err) {
    // Unique receiptId: a concurrent second scan of the same receipt (rule 3).
    if (err.code === 'P2002') await reject(REASONS.RECEIPT_ALREADY_AWARDED);
    throw err;
  }

  return {
    points: verdict.points,
    rule: verdict.rule,
    expiredPoints,
    receipt: { id: receipt.id, number: receipt.number, totalCents: receipt.totalCents },
    guest: { name: guest.user.name, balance: updated.balance, ...expiryInfo(updated, settings) },
  };
}

/** Redeem a reward for a guest (rules 4, 5, 6, 8). */
export async function redeemReward(waiter, { qrToken, rewardId }, now = new Date()) {
  const settings = await getSettings(waiter.tenantId);
  const location = await requireWaiterLocation(waiter);
  const base = { tenantId: waiter.tenantId, action: 'REDEEM', waiterId: waiter.id, locationId: location.id };

  const reward = await prisma.reward.findFirst({ where: { id: rewardId, tenantId: waiter.tenantId } });
  if (!reward) throw notFound('Nagrada nije pronađena.');

  const guest = await findGuestByToken(waiter.tenantId, qrToken);
  if (!guest) {
    await logAttempt({ ...base, reason: REASONS.GUEST_NOT_FOUND, rewardId: reward.id });
    throw new RuleRejection(REASONS.GUEST_NOT_FOUND);
  }

  await refreshGuest(guest.id, settings, now);

  const result = await prisma.$transaction(async (tx) => {
    const profile = await lockGuest(tx, guest.id);
    const verdict = evaluateRedeem({ balance: profile.balance, reward, location, settings, now });
    if (!verdict.ok) return { rejected: verdict.reason };
    await tx.pointTransaction.create({
      data: {
        tenantId: waiter.tenantId,
        type: 'REDEEM',
        guestProfileId: guest.id,
        points: -reward.pointsCost,
        rewardId: reward.id,
        waiterId: waiter.id,
        locationId: location.id,
        costCents: reward.costPriceCents,
        ruleSnapshot: { pointsCost: reward.pointsCost, costPriceCents: reward.costPriceCents },
        createdAt: now,
      },
    });
    const updated = await tx.guestProfile.update({
      where: { id: guest.id },
      data: { balance: { decrement: reward.pointsCost } },
    });
    return { updated };
  });

  if (result.rejected) {
    await logAttempt({ ...base, reason: result.rejected, guestProfileId: guest.id, rewardId: reward.id });
    throw new RuleRejection(result.rejected, { guestName: guest.user.name });
  }

  return {
    reward: { id: reward.id, name: reward.name, pointsCost: reward.pointsCost },
    ...(await guestSnapshot(result.updated, guest.user.name, settings, location, now)),
  };
}
