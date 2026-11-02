import { Router } from 'express';
import { prisma } from '../db.js';
import { HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { buildEarningRule } from '../domain/points.js';
import { isHappyHourAt } from '../domain/time.js';
import { expiryInfo, getSettings, refreshGuest } from '../services/loyalty.js';
import { renderCardPdf } from '../services/card.js';

/** Guest API — a guest only ever sees their own profile (looked up by the logged-in user id). */
export const guestRouter = Router();
guestRouter.use(requireAuth('GUEST'));

async function ownProfile(user) {
  const profile = await prisma.guestProfile.findFirst({ where: { userId: user.id, tenantId: user.tenantId } });
  if (!profile) throw new HttpError(404, 'NOT_FOUND', 'Profil gosta nije pronađen.');
  return profile;
}

function expiryRuleText(settings) {
  switch (settings.expiryMode) {
    case 'INACTIVITY':
      return `Bodovi se resetiraju na 0 ako ne skupljate bodove ${settings.expiryInactivityMonths} mj. Svaki posjet s bodovima produžuje rok.`;
    case 'FIXED_DATE':
      return `Svi bodovi resetiraju se na 0 nakon ${settings.expiryDay}. ${settings.expiryMonth}. svake godine.`;
    case 'PERIOD':
      return `Svi bodovi resetiraju se na 0 svakih ${settings.expiryPeriodMonths} mj.`;
    default:
      return null;
  }
}

guestRouter.get('/me', async (req, res) => {
  const settings = await getSettings(req.user.tenantId);
  const { profile, expiredPoints } = await refreshGuest((await ownProfile(req.user)).id, settings);
  const [tenant, rewards, locations] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: req.user.tenantId }, select: { name: true, slug: true } }),
    prisma.reward.findMany({ where: { tenantId: req.user.tenantId, active: true }, orderBy: { pointsCost: 'asc' } }),
    prisma.location.findMany({ where: { tenantId: req.user.tenantId, programEnabled: true }, select: { name: true }, orderBy: { name: 'asc' } }),
  ]);

  res.json({
    name: req.user.name,
    email: req.user.email,
    tenant,
    qrToken: profile.qrToken,
    balance: profile.balance,
    expiredPoints,
    ...expiryInfo(profile, settings),
    expiryRule: expiryRuleText(settings),
    earningRule: buildEarningRule(settings),
    happyHour: {
      enabled: settings.happyHourEnabled,
      active: isHappyHourAt(new Date(), settings),
      start: settings.happyHourStart,
      end: settings.happyHourEnd,
      days: settings.happyHourDays,
    },
    locations: locations.map((l) => l.name),
    rewards: rewards.map((r) => ({
      id: r.id,
      name: r.name,
      pointsCost: r.pointsCost,
      missing: Math.max(0, r.pointsCost - profile.balance),
      progress: Math.min(1, profile.balance / r.pointsCost),
    })),
  });
});

guestRouter.get('/history', async (req, res) => {
  const profile = await ownProfile(req.user);
  const rows = await prisma.pointTransaction.findMany({
    where: { guestProfileId: profile.id, tenantId: req.user.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      location: { select: { name: true } },
      reward: { select: { name: true } },
      receipt: { select: { number: true, totalCents: true } },
    },
  });
  res.json(
    rows.map((t) => ({
      id: t.id,
      type: t.type,
      points: t.points,
      createdAt: t.createdAt,
      location: t.location?.name ?? null,
      reward: t.reward?.name ?? null,
      receipt: t.receipt ? { number: t.receipt.number, totalCents: t.receipt.totalCents } : null,
    })),
  );
});

guestRouter.get('/card.pdf', async (req, res) => {
  const profile = await ownProfile(req.user);
  const [tenant, locations] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: req.user.tenantId } }),
    prisma.location.findMany({ where: { tenantId: req.user.tenantId, programEnabled: true }, orderBy: { name: 'asc' } }),
  ]);
  const doc = await renderCardPdf({
    tenantName: tenant.name,
    guestName: req.user.name,
    qrToken: profile.qrToken,
    locations: locations.map((l) => l.name),
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="kartica-${tenant.slug}.pdf"`);
  doc.pipe(res);
});
