/**
 * Idempotent seed.
 *  - The full demo dataset is created once, inside a transaction, only if tenant "mandrac" is missing.
 *  - On every start, each location gets a few un-awarded receipts for *today* if it has none,
 *    so the waiter flow can be demoed immediately (idempotent per day).
 */
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';
import { PrismaClient } from '@prisma/client';
import { ZONE, isHappyHourAt, startOfZagrebDay, toZoned } from '../src/domain/time.js';
import { buildEarningRule, calculatePoints } from '../src/domain/points.js';
import { generateQrToken } from '../src/lib/token.js';

const prisma = new PrismaClient();
const PASSWORD = 'demo1234';
const TENANT_SLUG = 'mandrac';

// Deterministic PRNG so every fresh seed produces the same story.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261102);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));

const PRODUCTS = [
  ['Espresso', 'Kava', 160, 1],
  ['Kava s mlijekom', 'Kava', 190, 1],
  ['Cappuccino', 'Kava', 220, 1],
  ['Bijela kava', 'Kava', 240, 1],
  ['Čaj', 'Topli napici', 200, 1],
  ['Topla čokolada', 'Topli napici', 280, 1],
  ['Cijeđena naranča', 'Sokovi', 350, 1],
  ['Prirodni sok', 'Sokovi', 300, 1],
  ['Coca-Cola 0,25 l', 'Sokovi', 320, 1],
  ['Mineralna voda', 'Sokovi', 250, 0],
  ['Točeno pivo 0,3 l', 'Pivo', 300, 1],
  ['Točeno pivo 0,5 l', 'Pivo', 420, 2],
  ['Malvazija 0,1 l', 'Vino', 280, 1],
  ['Teran 0,1 l', 'Vino', 280, 1],
];

const GUEST_NAMES = [
  'Ivana Horvat', 'Luka Perić', 'Ana Marić', 'Marin Jurić', 'Petra Novak', 'Josip Kovačević',
  'Maja Babić', 'Tomislav Knežević', 'Lucija Vuković', 'Filip Pavlović', 'Sara Božić', 'Matej Grgić',
  'Ema Radić', 'Karlo Šarić', 'Nika Lovrić', 'Dario Matić', 'Iva Petrović', 'Ante Bašić',
  'Mia Tomić', 'Bruno Zorić', 'Lana Vidović', 'Roko Klarić', 'Tea Barišić', 'Fran Benčić',
  'Klara Rajković', 'Ivan Starić', 'Dora Žufić', 'Leon Ivančić', 'Paula Milovan', 'Nikola Brajković',
];

const slugEmail = (name) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z ]/g, '')
    .trim()
    .replace(/ +/g, '.') + '@example.com';

async function seedAll(tx, now) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const zNow = toZoned(now);
  const programStartAt = zNow.minus({ months: 14 }).startOf('day').toJSDate();

  await tx.user.upsert({
    where: { email: 'admin@superius.hr' },
    update: {},
    create: { email: 'admin@superius.hr', name: 'Superius Admin', role: 'SUPERADMIN', passwordHash },
  });

  const tenant = await tx.tenant.create({ data: { name: 'Caffe bar Mandrač', slug: TENANT_SLUG } });
  const centar = await tx.location.create({ data: { tenantId: tenant.id, name: 'Centar', address: 'Pula, centar' } });
  const verudela = await tx.location.create({ data: { tenantId: tenant.id, name: 'Verudela', address: 'Pula, Verudela' } });
  const locations = [centar, verudela];

  const settings = await tx.programSettings.create({
    data: {
      tenantId: tenant.id,
      earningMode: 'AMOUNT',
      pointsPerEuro: 1,
      expiryMode: 'INACTIVITY',
      expiryInactivityMonths: 12,
      expiryDay: 31,
      expiryMonth: 12,
      expiryPeriodMonths: 6,
      programStartAt,
      expirySettingsChangedAt: programStartAt,
      happyHourEnabled: true,
      happyHourStart: '17:00',
      happyHourEnd: '19:00',
      happyHourDays: [1, 2, 3, 4, 5],
      dailyScanLimitPerGuest: 3,
    },
  });
  const rule = buildEarningRule(settings);

  await tx.user.create({
    data: { email: 'owner@mandrac.hr', name: 'Marko Juričić', role: 'OWNER', tenantId: tenant.id, passwordHash },
  });
  const waiterCentar = await tx.user.create({
    data: {
      email: 'konobar.centar@mandrac.hr', name: 'Ana Kovač', role: 'WAITER',
      tenantId: tenant.id, locationId: centar.id, passwordHash,
    },
  });
  const waiterVerudela = await tx.user.create({
    data: {
      email: 'konobar.verudela@mandrac.hr', name: 'Petar Babić', role: 'WAITER',
      tenantId: tenant.id, locationId: verudela.id, passwordHash,
    },
  });
  const waiterFor = { [centar.id]: waiterCentar, [verudela.id]: waiterVerudela };

  const products = [];
  for (const [i, [name, category, priceCents, pointsPerItem]] of PRODUCTS.entries()) {
    products.push(
      await tx.product.create({
        data: { tenantId: tenant.id, name, category, priceCents, pointsPerItem, sortOrder: i },
      }),
    );
  }
  const espresso = products[0];

  const rewards = [];
  for (const [name, pointsCost, costPriceCents] of [
    ['Kava', 10, 30],
    ['Bezalkoholno piće', 15, 60],
    ['Pivo', 20, 90],
  ]) {
    rewards.push(await tx.reward.create({ data: { tenantId: tenant.id, name, pointsCost, costPriceCents } }));
  }

  // ---- Guests -------------------------------------------------------------------------
  const guests = [];
  for (const [i, name] of GUEST_NAMES.entries()) {
    const isDemo = i === 0;
    const isExpired = name === 'Ivan Starić';
    const isNew = i >= 27; // a few members without any visit yet
    const createdAt = isExpired
      ? zNow.minus({ months: 13, days: 10 }).toJSDate()
      : isNew
        ? zNow.minus({ days: between(1, 10) }).toJSDate()
        : zNow.minus({ days: between(92, 100) }).toJSDate();
    const user = await tx.user.create({
      data: {
        email: isDemo ? 'gost@example.com' : slugEmail(name),
        name, role: 'GUEST', tenantId: tenant.id, passwordHash, createdAt,
      },
    });
    const profile = await tx.guestProfile.create({
      data: {
        userId: user.id, tenantId: tenant.id, qrToken: isDemo ? 'DEMO-GOST-2026' : generateQrToken(),
        createdAt, lastResetAt: createdAt,
      },
    });
    guests.push({
      profile, name, isDemo, isExpired, isNew,
      visitsPerWeek: isDemo ? 3 : 0.4 + rand() * 3,
      homeLocation: locations[i % 2],
      balance: 0, lastActivityAt: null,
    });
  }

  // ---- History (receipts → earns / happy-hour attempts / redemptions) ------------------
  const receipts = [];
  const receiptItems = [];
  const transactions = [];
  const attempts = [];

  const makeReceipt = (location, paidAt, lines) => {
    const id = randomUUID();
    const items = lines.map(([product, quantity]) => ({
      id: randomUUID(), receiptId: id, productId: product.id, name: product.name,
      quantity, unitPriceCents: product.priceCents, pointsPerItem: product.pointsPerItem,
    }));
    const totalCents = items.reduce((s, it) => s + it.quantity * it.unitPriceCents, 0);
    const receipt = {
      id, tenantId: tenant.id, locationId: location.id, waiterId: waiterFor[location.id].id,
      totalCents, paidAt, isHappyHour: isHappyHourAt(paidAt, settings), earningRule: rule,
    };
    receipts.push(receipt);
    receiptItems.push(...items);
    return { ...receipt, items };
  };

  const randomLines = () => {
    const lines = [];
    const count = between(1, 3);
    for (let k = 0; k < count; k += 1) lines.push([pick(products), rand() < 0.75 ? 1 : 2]);
    return lines;
  };

  const events = [];
  for (const g of guests) {
    if (g.isNew || g.isExpired) continue;
    for (let d = 90; d >= 1; d -= 1) {
      if (rand() > g.visitsPerWeek / 7) continue;
      const hour = pick([7, 8, 8, 9, 9, 10, 11, 12, 14, 16, 17, 18, 19, 20, 21, 22]);
      const paidAt = zNow.minus({ days: d }).set({ hour, minute: between(0, 59), second: 0, millisecond: 0 }).toJSDate();
      const location = rand() < 0.75 ? g.homeLocation : locations.find((l) => l.id !== g.homeLocation.id);
      events.push({ g, paidAt, location });
    }
  }
  events.sort((a, b) => a.paidAt - b.paidAt);

  const earn = (g, receipt, waiter, at) => {
    const points = calculatePoints(receipt, rule);
    transactions.push({
      id: randomUUID(), tenantId: tenant.id, type: 'EARN', guestProfileId: g.profile.id, points,
      receiptId: receipt.id, waiterId: waiter.id, locationId: receipt.locationId, ruleSnapshot: rule, createdAt: at,
    });
    g.balance += points;
    if (!g.lastActivityAt || at > g.lastActivityAt) g.lastActivityAt = at;
  };

  for (const { g, paidAt, location } of events) {
    const receipt = makeReceipt(location, paidAt, randomLines());
    const waiter = waiterFor[location.id];
    const scanAt = new Date(paidAt.getTime() + between(1, 4) * 60_000);
    if (receipt.isHappyHour) {
      if (rand() < 0.4) {
        attempts.push({
          id: randomUUID(), tenantId: tenant.id, action: 'EARN', reason: 'HAPPY_HOUR', waiterId: waiter.id,
          guestProfileId: g.profile.id, receiptId: receipt.id, locationId: location.id, createdAt: scanAt,
        });
      }
      continue;
    }
    earn(g, receipt, waiter, scanAt);

    const affordable = rewards.filter((r) => r.pointsCost <= g.balance);
    const redeemAt = new Date(scanAt.getTime() + 2 * 60_000);
    if (affordable.length && rand() < 0.35 && !isHappyHourAt(redeemAt, settings)) {
      const reward = pick(affordable);
      g.balance -= reward.pointsCost;
      transactions.push({
        id: randomUUID(), tenantId: tenant.id, type: 'REDEEM', guestProfileId: g.profile.id,
        points: -reward.pointsCost, rewardId: reward.id, waiterId: waiter.id, locationId: location.id,
        costCents: reward.costPriceCents, createdAt: redeemAt,
      });
    }
  }

  // ---- Expired guest: last activity 13 months ago ---------------------------------------
  const expired = guests.find((g) => g.isExpired);
  {
    const paidAt = zNow.minus({ months: 13 }).set({ hour: 10, minute: 15 }).toJSDate();
    const receipt = makeReceipt(centar, paidAt, [[products[11], 3], [products[12], 2], [products[2], 2]]);
    earn(expired, receipt, waiterCentar, new Date(paidAt.getTime() + 60_000));
  }

  // ---- Suspicious pattern: Ana (Centar) keeps awarding Luka Perić ------------------------
  const luka = guests.find((g) => g.name === 'Luka Perić');
  const burstDay = zNow.minus({ days: 9 });
  for (const [h, m] of [[9, 5], [10, 40], [12, 15], [14, 20], [15, 55]]) {
    const paidAt = burstDay.set({ hour: h, minute: m, second: 0, millisecond: 0 }).toJSDate();
    const receipt = makeReceipt(centar, paidAt, [[espresso, 2], [products[10], 1]]);
    earn(luka, receipt, waiterCentar, new Date(paidAt.getTime() + 60_000));
  }
  for (let d = 25; d >= 11; d -= 2) {
    const day = zNow.minus({ days: d });
    if (day.weekday > 5) continue;
    const paidAt = day.set({ hour: 11, minute: between(0, 50), second: 0, millisecond: 0 }).toJSDate();
    const receipt = makeReceipt(centar, paidAt, [[espresso, 2], [products[10], 1]]);
    earn(luka, receipt, waiterCentar, new Date(paidAt.getTime() + 60_000));
  }
  // Repeated rejected attempts: the same already-awarded receipt scanned again three times.
  const lukaLastEarn = transactions.filter((t) => t.guestProfileId === luka.profile.id && t.type === 'EARN').at(-1);
  for (const minutes of [3, 6, 11]) {
    attempts.push({
      id: randomUUID(), tenantId: tenant.id, action: 'EARN', reason: 'RECEIPT_ALREADY_AWARDED',
      waiterId: waiterCentar.id, guestProfileId: luka.profile.id, receiptId: lukaLastEarn.receiptId,
      locationId: centar.id, createdAt: new Date(lukaLastEarn.createdAt.getTime() + minutes * 60_000),
    });
  }
  // A few other rejections for realism.
  for (const [g, days, reason, location] of [
    [guests[3], 20, 'INSUFFICIENT_POINTS', verudela],
    [guests[8], 6, 'INSUFFICIENT_POINTS', centar],
    [guests[12], 3, 'RECEIPT_NOT_TODAY', verudela],
  ]) {
    attempts.push({
      id: randomUUID(), tenantId: tenant.id, action: reason === 'INSUFFICIENT_POINTS' ? 'REDEEM' : 'EARN',
      reason, waiterId: waiterFor[location.id].id, guestProfileId: g.profile.id,
      rewardId: reason === 'INSUFFICIENT_POINTS' ? rewards[2].id : null, locationId: location.id,
      createdAt: zNow.minus({ days }).set({ hour: 11, minute: 30 }).toJSDate(),
    });
  }

  // ---- Persist ---------------------------------------------------------------------------
  receipts.sort((a, b) => a.paidAt - b.paidAt).forEach((r, i) => { r.number = i + 1; });
  const chunk = async (model, rows) => {
    for (let i = 0; i < rows.length; i += 500) await tx[model].createMany({ data: rows.slice(i, i + 500) });
  };
  await chunk('receipt', receipts);
  await chunk('receiptItem', receiptItems);
  await chunk('pointTransaction', transactions);
  await chunk('scanAttempt', attempts);
  for (const g of guests) {
    await tx.guestProfile.update({
      where: { id: g.profile.id },
      data: { balance: g.balance, lastActivityAt: g.lastActivityAt },
    });
  }

  console.log(
    `Seed: ${guests.length} guests, ${receipts.length} receipts, ${transactions.length} transactions, ${attempts.length} rejected attempts.`,
  );
}

/** Make sure every program location has a few un-awarded receipts issued today. */
async function ensureTodayReceipts(now) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG }, include: { settings: true } });
  if (!tenant?.settings) return;
  const dayStart = startOfZagrebDay(now);
  const products = await prisma.product.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { sortOrder: 'asc' } });
  const locations = await prisma.location.findMany({ where: { tenantId: tenant.id } });
  const rule = buildEarningRule(tenant.settings);
  const baskets = [
    [[0, 2], [9, 1]],
    [[2, 1], [6, 1], [11, 1]],
    [[11, 2], [12, 1]],
  ];

  for (const location of locations) {
    const open = await prisma.receipt.count({
      where: { locationId: location.id, paidAt: { gte: dayStart }, earnTransaction: null },
    });
    if (open > 0) continue;
    const waiter = await prisma.user.findFirst({ where: { locationId: location.id, role: 'WAITER', active: true } });
    if (!waiter) continue;

    for (const [i, basket] of baskets.entries()) {
      const minutesAgo = [55, 30, 8][i];
      const paidAt = new Date(Math.max(now.getTime() - minutesAgo * 60_000, dayStart.getTime() + (i + 1) * 60_000));
      const items = basket
        .filter(([idx]) => products[idx])
        .map(([idx, quantity]) => ({
          productId: products[idx].id, name: products[idx].name, quantity,
          unitPriceCents: products[idx].priceCents, pointsPerItem: products[idx].pointsPerItem,
        }));
      const totalCents = items.reduce((s, it) => s + it.quantity * it.unitPriceCents, 0);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          await prisma.$transaction(async (tx) => {
            const max = await tx.receipt.aggregate({ where: { tenantId: tenant.id }, _max: { number: true } });
            await tx.receipt.create({
              data: {
                tenantId: tenant.id, number: (max._max.number ?? 0) + 1, locationId: location.id, waiterId: waiter.id,
                totalCents, paidAt, isHappyHour: isHappyHourAt(paidAt, tenant.settings), earningRule: rule,
                items: { create: items },
              },
            });
          });
          break;
        } catch (err) {
          if (err.code !== 'P2002') throw err;
        }
      }
    }
    console.log(`Seed: created today's demo receipts for ${location.name}.`);
  }
}

async function main() {
  const now = new Date();
  const existing = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (existing) {
    console.log('Seed: tenant "mandrac" already exists — skipping full seed.');
  } else {
    await prisma.$transaction((tx) => seedAll(tx, now), { timeout: 120_000, maxWait: 10_000 });
  }
  await ensureTodayReceipts(now);
  console.log(`Seed: done (${DateTime.now().setZone(ZONE).toFormat('dd.MM.yyyy HH:mm')} ${ZONE}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
