import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { badRequest, parse } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { buildEarningRule, calculatePoints, receiptTotalCents } from '../domain/points.js';
import { isHappyHourAt, startOfZagrebDay } from '../domain/time.js';
import { awardPoints, getSettings, lookupGuest, redeemReward } from '../services/loyalty.js';

/** Waiter API — everything is scoped to the waiter's tenant AND location (rule 9, 11). */
export const waiterRouter = Router();
waiterRouter.use(requireAuth('WAITER'));

waiterRouter.get('/context', async (req, res) => {
  const [settings, location] = await Promise.all([
    getSettings(req.user.tenantId),
    prisma.location.findFirst({ where: { id: req.user.locationId, tenantId: req.user.tenantId } }),
  ]);
  res.json({
    location: { id: location.id, name: location.name, programEnabled: location.programEnabled },
    happyHour: {
      active: isHappyHourAt(new Date(), settings),
      enabled: settings.happyHourEnabled,
      start: settings.happyHourStart,
      end: settings.happyHourEnd,
      days: settings.happyHourDays,
    },
    earningRule: buildEarningRule(settings),
  });
});

waiterRouter.get('/products', async (req, res) => {
  const products = await prisma.product.findMany({
    where: { tenantId: req.user.tenantId, active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, category: true, priceCents: true, pointsPerItem: true },
  });
  res.json(products);
});

const receiptSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(50) }))
    .min(1, 'Dodajte barem jedan artikl.')
    .max(40),
});

const receiptInclude = {
  items: { select: { id: true, name: true, quantity: true, unitPriceCents: true, pointsPerItem: true } },
  earnTransaction: { select: { points: true, createdAt: true, guest: { select: { user: { select: { name: true } } } } } },
};

function toReceiptDto(r) {
  return {
    id: r.id,
    number: r.number,
    totalCents: r.totalCents,
    paidAt: r.paidAt,
    isHappyHour: r.isHappyHour,
    earningRule: r.earningRule,
    estimatedPoints: r.isHappyHour ? 0 : calculatePoints(r, r.earningRule),
    items: r.items,
    awarded: r.earnTransaction
      ? { points: r.earnTransaction.points, at: r.earnTransaction.createdAt, guestName: r.earnTransaction.guest.user.name }
      : null,
  };
}

/**
 * POS simulation: issue a receipt from the price list. The waiter picks products and quantities only;
 * prices come from the price list and are copied onto the receipt.
 */
waiterRouter.post('/receipts', async (req, res) => {
  const { items } = parse(receiptSchema, req.body);
  const { tenantId, locationId, id: waiterId } = req.user;
  const settings = await getSettings(tenantId);

  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: ids }, tenantId, active: true } });
  if (products.length !== ids.length) throw badRequest('Neki artikli više nisu u cjeniku. Osvježite stranicu.');
  const byId = new Map(products.map((p) => [p.id, p]));

  // Merge duplicate lines.
  const merged = new Map();
  for (const { productId, quantity } of items) merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  const lines = [...merged].map(([productId, quantity]) => {
    const p = byId.get(productId);
    return { productId, name: p.name, quantity, unitPriceCents: p.priceCents, pointsPerItem: p.pointsPerItem };
  });

  const now = new Date();
  const data = {
    tenantId,
    locationId,
    waiterId,
    totalCents: receiptTotalCents(lines),
    paidAt: now,
    isHappyHour: isHappyHourAt(now, settings),
    earningRule: buildEarningRule(settings),
    items: { create: lines },
  };

  // Receipt numbers are sequential per tenant; retry on a concurrent collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const receipt = await prisma.$transaction(async (tx) => {
        const max = await tx.receipt.aggregate({ where: { tenantId }, _max: { number: true } });
        return tx.receipt.create({ data: { ...data, number: (max._max.number ?? 0) + 1 }, include: receiptInclude });
      });
      return res.status(201).json(toReceiptDto(receipt));
    } catch (err) {
      if (err.code !== 'P2002') throw err;
    }
  }
  throw new Error('Could not allocate a receipt number');
});

/** Today's receipts at the waiter's location. ?status=open shows only receipts without points. */
waiterRouter.get('/receipts', async (req, res) => {
  const open = req.query.status === 'open';
  const receipts = await prisma.receipt.findMany({
    where: {
      tenantId: req.user.tenantId,
      locationId: req.user.locationId,
      paidAt: { gte: startOfZagrebDay(new Date()) },
      ...(open ? { earnTransaction: null } : {}),
    },
    include: receiptInclude,
    orderBy: { paidAt: 'desc' },
    take: 50,
  });
  res.json(receipts.map(toReceiptDto));
});

const tokenSchema = z.object({ qrToken: z.string().trim().min(4, 'Unesite kod gosta.').max(64) });

waiterRouter.post('/award', async (req, res) => {
  const body = parse(tokenSchema.extend({ receiptId: z.string().min(1, 'Odaberite račun.') }), req.body);
  res.json(await awardPoints(req.user, body));
});

waiterRouter.post('/guests/lookup', async (req, res) => {
  const { qrToken } = parse(tokenSchema, req.body);
  res.json(await lookupGuest(req.user, qrToken));
});

waiterRouter.post('/redeem', async (req, res) => {
  const body = parse(tokenSchema.extend({ rewardId: z.string().min(1, 'Odaberite nagradu.') }), req.body);
  res.json(await redeemReward(req.user, body));
});
