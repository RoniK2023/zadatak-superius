import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { prisma } from '../db.js';
import { conflict, notFound, parse } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { expirySettingsChanged } from '../domain/expiry.js';
import { ZONE, parseHHMM, toZoned } from '../domain/time.js';
import { getSettings } from '../services/loyalty.js';

/** Owner configuration: settings, rewards, price list, locations, waiters. Tenant comes from the session. */
export const ownerAdminRouter = Router();
ownerAdminRouter.use(requireAuth('OWNER'));

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const name = (label) => z.string().trim().min(1, `Unesite ${label}.`).max(80, 'Najviše 80 znakova.');
const int = (min, max, msg) => z.coerce.number({ invalid_type_error: msg }).int(msg).min(min, msg).max(max, msg);

function settingsDto(s) {
  return {
    ...s,
    pointsPerEuro: Number(s.pointsPerEuro),
    programStartAt: toZoned(s.programStartAt).toISODate(),
  };
}

/** Finds a row by id inside the owner's tenant or 404s — prevents cross-tenant access by id. */
async function findOwned(model, id, tenantId) {
  const row = await prisma[model].findFirst({ where: { id, tenantId } });
  if (!row) throw notFound();
  return row;
}

// ---------------------------------------------------------------- Program settings

const settingsSchema = z
  .object({
    earningMode: z.enum(['AMOUNT', 'ITEM']),
    pointsPerEuro: z.coerce.number().min(0.01, 'Najmanje 0,01.').max(100, 'Najviše 100.'),
    expiryMode: z.enum(['FIXED_DATE', 'PERIOD', 'INACTIVITY']),
    expiryDay: int(1, 31, 'Dan 1–31.').nullable().optional(),
    expiryMonth: int(1, 12, 'Mjesec 1–12.').nullable().optional(),
    expiryPeriodMonths: int(1, 120, 'Između 1 i 120 mjeseci.').nullable().optional(),
    expiryInactivityMonths: int(1, 120, 'Između 1 i 120 mjeseci.').nullable().optional(),
    programStartAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Neispravan datum.'),
    happyHourEnabled: z.boolean(),
    happyHourStart: z.string().refine((v) => parseHHMM(v) !== null, 'Vrijeme u obliku HH:MM.'),
    happyHourEnd: z.string().refine((v) => parseHHMM(v) !== null, 'Vrijeme u obliku HH:MM.'),
    happyHourDays: z.array(z.number().int().min(1).max(7)).max(7),
    dailyScanLimitPerGuest: int(1, 50, 'Između 1 i 50.'),
  })
  .superRefine((s, ctx) => {
    const req = (field, message) => ctx.addIssue({ code: 'custom', path: [field], message });
    if (s.expiryMode === 'FIXED_DATE') {
      if (!s.expiryDay) req('expiryDay', 'Unesite dan.');
      if (!s.expiryMonth) req('expiryMonth', 'Odaberite mjesec.');
      if (s.expiryDay && s.expiryMonth && s.expiryDay > DAYS_IN_MONTH[s.expiryMonth - 1]) {
        req('expiryDay', 'Taj mjesec nema toliko dana.');
      }
    }
    if (s.expiryMode === 'PERIOD' && !s.expiryPeriodMonths) req('expiryPeriodMonths', 'Unesite razdoblje.');
    if (s.expiryMode === 'INACTIVITY' && !s.expiryInactivityMonths) req('expiryInactivityMonths', 'Unesite broj mjeseci.');
    if (!DateTime.fromISO(s.programStartAt, { zone: ZONE }).isValid) req('programStartAt', 'Neispravan datum.');
    if (s.happyHourEnabled) {
      if (s.happyHourStart === s.happyHourEnd) req('happyHourEnd', 'Kraj mora biti različit od početka.');
      if (!s.happyHourDays.length) req('happyHourDays', 'Odaberite barem jedan dan.');
    }
  });

ownerAdminRouter.get('/settings', async (req, res) => {
  res.json(settingsDto(await getSettings(req.user.tenantId)));
});

ownerAdminRouter.put('/settings', async (req, res) => {
  const input = parse(settingsSchema, req.body);
  const before = await getSettings(req.user.tenantId);
  const data = {
    ...input,
    expiryDay: input.expiryDay ?? null,
    expiryMonth: input.expiryMonth ?? null,
    expiryPeriodMonths: input.expiryPeriodMonths ?? null,
    expiryInactivityMonths: input.expiryInactivityMonths ?? null,
    programStartAt: DateTime.fromISO(input.programStartAt, { zone: ZONE }).startOf('day').toJSDate(),
    happyHourDays: [...new Set(input.happyHourDays)].sort(),
  };
  // Rule 7: changing expiry restarts the countdown from now, so nobody loses points instantly.
  const expiryChanged = expirySettingsChanged(before, data);
  if (expiryChanged) data.expirySettingsChangedAt = new Date();
  const earningChanged = before.earningMode !== data.earningMode || Number(before.pointsPerEuro) !== data.pointsPerEuro;

  const saved = await prisma.programSettings.update({ where: { tenantId: req.user.tenantId }, data });
  res.json({ settings: settingsDto(saved), expiryChanged, earningChanged });
});

// ---------------------------------------------------------------- Rewards

const rewardSchema = z.object({
  name: name('naziv'),
  pointsCost: int(1, 100000, 'Unesite cijeli broj bodova (1 ili više).'),
  costPriceCents: int(0, 1000000, 'Unesite nabavnu cijenu.'),
  active: z.boolean().default(true),
});

ownerAdminRouter.get('/rewards', async (req, res) => {
  const rewards = await prisma.reward.findMany({
    where: { tenantId: req.user.tenantId },
    orderBy: [{ active: 'desc' }, { pointsCost: 'asc' }],
    include: { _count: { select: { transactions: true } } },
  });
  res.json(rewards.map(({ _count, ...r }) => ({ ...r, redeemedCount: _count.transactions })));
});

ownerAdminRouter.post('/rewards', async (req, res) => {
  const data = parse(rewardSchema, req.body);
  res.status(201).json(await prisma.reward.create({ data: { ...data, tenantId: req.user.tenantId } }));
});

ownerAdminRouter.put('/rewards/:id', async (req, res) => {
  await findOwned('reward', req.params.id, req.user.tenantId);
  const data = parse(rewardSchema, req.body);
  res.json(await prisma.reward.update({ where: { id: req.params.id }, data }));
});

ownerAdminRouter.delete('/rewards/:id', async (req, res) => {
  await findOwned('reward', req.params.id, req.user.tenantId);
  const [used, attempts] = await Promise.all([
    prisma.pointTransaction.count({ where: { rewardId: req.params.id } }),
    prisma.scanAttempt.count({ where: { rewardId: req.params.id } }),
  ]);
  if (used || attempts) throw conflict('IN_USE', 'Nagrada je već korištena pa se ne može obrisati — deaktivirajte je.');
  await prisma.reward.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ---------------------------------------------------------------- Price list

const productSchema = z.object({
  name: name('naziv'),
  category: name('kategoriju'),
  priceCents: int(1, 1000000, 'Unesite cijenu veću od 0.'),
  pointsPerItem: int(0, 1000, 'Unesite 0 ili više.'),
  active: z.boolean().default(true),
});

ownerAdminRouter.get('/products', async (req, res) => {
  res.json(
    await prisma.product.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    }),
  );
});

ownerAdminRouter.post('/products', async (req, res) => {
  const data = parse(productSchema, req.body);
  const max = await prisma.product.aggregate({ where: { tenantId: req.user.tenantId }, _max: { sortOrder: true } });
  res.status(201).json(
    await prisma.product.create({ data: { ...data, tenantId: req.user.tenantId, sortOrder: (max._max.sortOrder ?? 0) + 1 } }),
  );
});

ownerAdminRouter.put('/products/:id', async (req, res) => {
  await findOwned('product', req.params.id, req.user.tenantId);
  const data = parse(productSchema, req.body);
  // Prices are copied onto receipts, so changing them never alters issued receipts.
  res.json(await prisma.product.update({ where: { id: req.params.id }, data }));
});

ownerAdminRouter.delete('/products/:id', async (req, res) => {
  await findOwned('product', req.params.id, req.user.tenantId);
  const used = await prisma.receiptItem.count({ where: { productId: req.params.id } });
  if (used) throw conflict('IN_USE', 'Artikl se nalazi na izdanim računima pa se ne može obrisati — deaktivirajte ga.');
  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ---------------------------------------------------------------- Locations

const locationSchema = z.object({
  name: name('naziv'),
  address: z.string().trim().max(120).optional().nullable(),
  programEnabled: z.boolean().default(true),
});

ownerAdminRouter.get('/locations', async (req, res) => {
  const locations = await prisma.location.findMany({
    where: { tenantId: req.user.tenantId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } } },
  });
  res.json(locations.map(({ _count, ...l }) => ({ ...l, waiterCount: _count.users })));
});

async function saveLocation(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.code === 'P2002') throw conflict('NAME_TAKEN', 'Lokacija s tim nazivom već postoji.');
    throw err;
  }
}

ownerAdminRouter.post('/locations', async (req, res) => {
  const data = parse(locationSchema, req.body);
  res.status(201).json(await saveLocation(() => prisma.location.create({ data: { ...data, tenantId: req.user.tenantId } })));
});

ownerAdminRouter.put('/locations/:id', async (req, res) => {
  await findOwned('location', req.params.id, req.user.tenantId);
  const data = parse(locationSchema, req.body);
  res.json(await saveLocation(() => prisma.location.update({ where: { id: req.params.id }, data })));
});

// ---------------------------------------------------------------- Waiters

const waiterBase = {
  name: name('ime'),
  locationId: z.string().min(1, 'Odaberite lokaciju.'),
  active: z.boolean().default(true),
};
const createWaiterSchema = z.object({
  ...waiterBase,
  email: z.string().trim().toLowerCase().email('Unesite ispravnu email adresu.'),
  password: z.string().min(8, 'Lozinka mora imati barem 8 znakova.').max(100),
});
const updateWaiterSchema = z.object({
  ...waiterBase,
  password: z.string().min(8, 'Lozinka mora imati barem 8 znakova.').max(100).optional().or(z.literal('')),
});

const waiterSelect = { id: true, name: true, email: true, active: true, locationId: true, createdAt: true, location: { select: { name: true } } };

ownerAdminRouter.get('/waiters', async (req, res) => {
  res.json(
    await prisma.user.findMany({
      where: { tenantId: req.user.tenantId, role: 'WAITER' },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      select: waiterSelect,
    }),
  );
});

ownerAdminRouter.post('/waiters', async (req, res) => {
  const data = parse(createWaiterSchema, req.body);
  await findOwned('location', data.locationId, req.user.tenantId);
  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    throw conflict('EMAIL_TAKEN', 'Korisnik s tim emailom već postoji.');
  }
  const waiter = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: 'WAITER',
      tenantId: req.user.tenantId,
      locationId: data.locationId,
      active: data.active,
      passwordHash: await bcrypt.hash(data.password, 10),
    },
    select: waiterSelect,
  });
  res.status(201).json(waiter);
});

ownerAdminRouter.put('/waiters/:id', async (req, res) => {
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, role: 'WAITER' } });
  if (!existing) throw notFound();
  const data = parse(updateWaiterSchema, req.body);
  await findOwned('location', data.locationId, req.user.tenantId);
  const waiter = await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      locationId: data.locationId,
      active: data.active,
      ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {}),
    },
    select: waiterSelect,
  });
  res.json(waiter);
});
