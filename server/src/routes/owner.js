import { Router } from 'express';
import { prisma } from '../db.js';
import { badRequest } from '../lib/http.js';
import { parsePeriod } from '../lib/period.js';
import { requireAuth } from '../middleware/auth.js';
import { aggregateTopGuests, estimateLiability } from '../domain/analytics.js';
import { evaluateExpiry } from '../domain/expiry.js';
import { FLAG_LABELS, FRAUD_THRESHOLDS, detectSuspiciousAttempts, detectSuspiciousEarns } from '../domain/fraud.js';
import { REASON_MESSAGES } from '../domain/rules.js';
import { getSettings } from '../services/loyalty.js';

/** Owner analytics — every query is scoped to req.user.tenantId (never taken from the client). */
export const ownerRouter = Router();
ownerRouter.use(requireAuth('OWNER'));

const DAY_MS = 86_400_000;

/** Validates an optional id filter against the owner's tenant. */
async function tenantScopedId(model, id, tenantId, extra = {}) {
  if (!id) return undefined;
  const row = await prisma[model].findFirst({ where: { id, tenantId, ...extra }, select: { id: true } });
  if (!row) throw badRequest('Neispravan filter.');
  return id;
}

async function names(tenantId) {
  const [locations, users] = await Promise.all([
    prisma.location.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { tenantId, role: { in: ['WAITER', 'GUEST'] } }, select: { id: true, name: true, email: true, guestProfile: { select: { id: true } } } }),
  ]);
  const guestNames = new Map(users.filter((u) => u.guestProfile).map((u) => [u.guestProfile.id, { name: u.name, email: u.email }]));
  return {
    location: new Map(locations.map((l) => [l.id, l.name])),
    user: new Map(users.map((u) => [u.id, u.name])),
    guest: guestNames,
  };
}

ownerRouter.get('/filters', async (req, res) => {
  const { tenantId } = req.user;
  const [locations, waiters, guests] = await Promise.all([
    prisma.location.findMany({ where: { tenantId }, orderBy: { name: 'asc' }, select: { id: true, name: true, programEnabled: true } }),
    prisma.user.findMany({ where: { tenantId, role: 'WAITER' }, orderBy: { name: 'asc' }, select: { id: true, name: true, locationId: true } }),
    prisma.guestProfile.findMany({
      where: { tenantId },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: 'asc' } },
      take: 1000,
    }),
  ]);
  res.json({ locations, waiters, guests: guests.map((g) => ({ id: g.id, name: g.user.name })) });
});

/** Liability (rule: estimate) — outstanding, non-expired points of all guests right now. */
async function computeLiability(tenantId, settings, now) {
  const [profiles, rewards] = await Promise.all([
    prisma.guestProfile.findMany({
      where: { tenantId, balance: { gt: 0 } },
      select: { balance: true, createdAt: true, lastActivityAt: true, lastResetAt: true },
    }),
    prisma.reward.findMany({ where: { tenantId, active: true } }),
  ]);
  // Points that would expire on next load are not a liability any more.
  const valid = profiles.filter((p) => !evaluateExpiry(p, settings, now).expired);
  const totalPoints = valid.reduce((s, p) => s + p.balance, 0);
  return { ...estimateLiability(totalPoints, rewards), guestsWithPoints: valid.length };
}

async function suspiciousEarnFlags(tenantId, settings, from, to) {
  const earns = await prisma.pointTransaction.findMany({
    where: { tenantId, type: 'EARN', createdAt: { gte: new Date(from.getTime() - FRAUD_THRESHOLDS.windowDays * DAY_MS), lte: to } },
    select: { id: true, guestProfileId: true, waiterId: true, createdAt: true },
  });
  return { flags: detectSuspiciousEarns(earns, settings), earns };
}

ownerRouter.get('/overview', async (req, res) => {
  const { tenantId } = req.user;
  const period = parsePeriod(req.query);
  const locationId = await tenantScopedId('location', req.query.locationId, tenantId);
  const settings = await getSettings(tenantId);
  const now = new Date();
  const where = { tenantId, createdAt: { gte: period.from, lte: period.to }, ...(locationId ? { locationId } : {}) };

  const [earns, redeems, expired, totalMembers, liability, lookup, recent, attemptsCount] = await Promise.all([
    prisma.pointTransaction.findMany({
      where: { ...where, type: 'EARN' },
      select: { guestProfileId: true, points: true, createdAt: true, locationId: true, receipt: { select: { totalCents: true } } },
    }),
    prisma.pointTransaction.findMany({ where: { ...where, type: 'REDEEM' }, select: { points: true, costCents: true } }),
    locationId
      ? Promise.resolve([])
      : prisma.pointTransaction.findMany({ where: { ...where, type: 'EXPIRE' }, select: { points: true } }),
    prisma.guestProfile.count({ where: { tenantId } }),
    computeLiability(tenantId, settings, now),
    names(tenantId),
    prisma.pointTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { reward: { select: { name: true } }, receipt: { select: { number: true, totalCents: true } } },
    }),
    prisma.scanAttempt.count({ where }),
  ]);

  const { flags } = await suspiciousEarnFlags(tenantId, settings, period.from, period.to);
  const inRange = [...flags.keys()];
  const flaggedInPeriod = inRange.length
    ? await prisma.pointTransaction.count({ where: { ...where, id: { in: inRange } } })
    : 0;

  const spendingCents = earns.reduce((s, t) => s + (t.receipt?.totalCents ?? 0), 0);
  const costCents = redeems.reduce((s, t) => s + (t.costCents ?? 0), 0);
  const top = aggregateTopGuests(earns).slice(0, 5);

  res.json({
    period: { from: period.fromDay, to: period.toDay },
    kpis: {
      spendingCents,
      visits: earns.length,
      averageReceiptCents: earns.length ? Math.round(spendingCents / earns.length) : 0,
      costCents,
      redeemedCount: redeems.length,
      costShare: spendingCents ? costCents / spendingCents : 0,
      activeMembers: new Set(earns.map((t) => t.guestProfileId)).size,
      totalMembers,
      pointsEarned: earns.reduce((s, t) => s + t.points, 0),
      pointsRedeemed: -redeems.reduce((s, t) => s + t.points, 0),
      pointsExpired: -expired.reduce((s, t) => s + t.points, 0),
      liability,
      flaggedTransactions: flaggedInPeriod,
      rejectedAttempts: attemptsCount,
    },
    topGuests: top.map((g) => ({
      ...g,
      name: lookup.guest.get(g.guestProfileId)?.name ?? '—',
      topLocation: lookup.location.get(g.topLocationId) ?? null,
    })),
    recent: recent.map((t) => ({
      id: t.id,
      type: t.type,
      points: t.points,
      createdAt: t.createdAt,
      guest: lookup.guest.get(t.guestProfileId)?.name ?? '—',
      waiter: t.waiterId ? lookup.user.get(t.waiterId) : null,
      location: t.locationId ? lookup.location.get(t.locationId) : null,
      reward: t.reward?.name ?? null,
      receipt: t.receipt,
    })),
  });
});

ownerRouter.get('/top-guests', async (req, res) => {
  const { tenantId } = req.user;
  const period = parsePeriod(req.query);
  const locationId = await tenantScopedId('location', req.query.locationId, tenantId);
  const [earns, lookup, balances] = await Promise.all([
    prisma.pointTransaction.findMany({
      where: { tenantId, type: 'EARN', createdAt: { gte: period.from, lte: period.to }, ...(locationId ? { locationId } : {}) },
      select: { guestProfileId: true, createdAt: true, locationId: true, receipt: { select: { totalCents: true } } },
    }),
    names(tenantId),
    prisma.guestProfile.findMany({ where: { tenantId }, select: { id: true, balance: true } }),
  ]);
  const balanceById = new Map(balances.map((b) => [b.id, b.balance]));
  res.json({
    period: { from: period.fromDay, to: period.toDay },
    guests: aggregateTopGuests(earns)
      .slice(0, 100)
      .map((g, i) => ({
        rank: i + 1,
        ...g,
        name: lookup.guest.get(g.guestProfileId)?.name ?? '—',
        email: lookup.guest.get(g.guestProfileId)?.email ?? null,
        topLocation: lookup.location.get(g.topLocationId) ?? null,
        balance: balanceById.get(g.guestProfileId) ?? 0,
      })),
  });
});

const TYPES = ['EARN', 'REDEEM', 'EXPIRE', 'REJECTED'];

/**
 * Activity log: point transactions + rejected attempts, merged and newest first,
 * with suspicious-activity flags. Filters: period, location, waiter, guest, type, flagged.
 */
ownerRouter.get('/activity', async (req, res) => {
  const { tenantId } = req.user;
  const period = parsePeriod(req.query);
  const [locationId, waiterId, guestId] = await Promise.all([
    tenantScopedId('location', req.query.locationId, tenantId),
    tenantScopedId('user', req.query.waiterId, tenantId, { role: 'WAITER' }),
    tenantScopedId('guestProfile', req.query.guestId, tenantId),
  ]);
  const type = TYPES.includes(req.query.type) ? req.query.type : null;
  const onlyFlagged = req.query.flagged === '1';
  const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const cap = 2000;

  const settings = await getSettings(tenantId);
  const base = {
    tenantId,
    createdAt: { gte: period.from, lte: period.to },
    ...(locationId ? { locationId } : {}),
    ...(waiterId ? { waiterId } : {}),
    ...(guestId ? { guestProfileId: guestId } : {}),
  };

  const [txs, attempts, lookup, { flags: earnFlags }] = await Promise.all([
    type === 'REJECTED'
      ? []
      : prisma.pointTransaction.findMany({
          where: { ...base, ...(type ? { type } : {}) },
          orderBy: { createdAt: 'desc' },
          take: cap,
          include: { reward: { select: { name: true } }, receipt: { select: { number: true, totalCents: true } } },
        }),
    type && type !== 'REJECTED'
      ? []
      : prisma.scanAttempt.findMany({
          where: base,
          orderBy: { createdAt: 'desc' },
          take: cap,
          include: { reward: { select: { name: true } }, receipt: { select: { number: true, totalCents: true } } },
        }),
    names(tenantId),
    suspiciousEarnFlags(tenantId, settings, period.from, period.to),
  ]);

  // Rejected-attempt bursts are judged on all attempts in the period, not just the filtered ones.
  const allAttempts = await prisma.scanAttempt.findMany({
    where: { tenantId, createdAt: { gte: period.from, lte: period.to } },
    select: { id: true, waiterId: true, guestProfileId: true, createdAt: true },
  });
  const attemptFlags = detectSuspiciousAttempts(allAttempts);

  const items = [
    ...txs.map((t) => ({
      id: t.id,
      kind: 'TRANSACTION',
      type: t.type,
      points: t.points,
      createdAt: t.createdAt,
      guest: { id: t.guestProfileId, name: lookup.guest.get(t.guestProfileId)?.name ?? '—' },
      waiter: t.waiterId ? { id: t.waiterId, name: lookup.user.get(t.waiterId) } : null,
      location: t.locationId ? lookup.location.get(t.locationId) : null,
      receipt: t.receipt,
      reward: t.reward?.name ?? null,
      costCents: t.costCents,
      ruleSnapshot: t.ruleSnapshot,
      flags: earnFlags.get(t.id) ?? [],
    })),
    ...attempts.map((a) => ({
      id: a.id,
      kind: 'ATTEMPT',
      type: 'REJECTED',
      action: a.action,
      reason: a.reason,
      reasonMessage: REASON_MESSAGES[a.reason] ?? a.reason,
      points: 0,
      createdAt: a.createdAt,
      guest: a.guestProfileId ? { id: a.guestProfileId, name: lookup.guest.get(a.guestProfileId)?.name ?? '—' } : null,
      waiter: { id: a.waiterId, name: lookup.user.get(a.waiterId) },
      location: lookup.location.get(a.locationId),
      receipt: a.receipt,
      reward: a.reward?.name ?? null,
      flags: attemptFlags.get(a.id) ?? [],
    })),
  ]
    .filter((item) => !onlyFlagged || item.flags.length > 0)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Suspicious waiter → guest pairs in the period (summary above the log).
  const pairs = new Map();
  for (const item of items) {
    if (!item.flags.length || !item.waiter || !item.guest) continue;
    const key = `${item.waiter.id}|${item.guest.id}`;
    const pair = pairs.get(key) ?? { waiter: item.waiter, guest: item.guest, earns: 0, rejected: 0, flags: new Set() };
    if (item.kind === 'ATTEMPT') pair.rejected += 1;
    else pair.earns += 1;
    item.flags.forEach((f) => pair.flags.add(f));
    pairs.set(key, pair);
  }

  res.json({
    period: { from: period.fromDay, to: period.toDay },
    total: items.length,
    truncated: txs.length === cap || attempts.length === cap,
    items: items.slice(offset, offset + limit),
    suspicious: [...pairs.values()]
      .map((p) => ({ ...p, flags: [...p.flags] }))
      .sort((a, b) => b.earns + b.rejected - (a.earns + a.rejected)),
    flagLabels: FLAG_LABELS,
    thresholds: { ...FRAUD_THRESHOLDS, dailyScanLimitPerGuest: settings.dailyScanLimitPerGuest },
  });
});
