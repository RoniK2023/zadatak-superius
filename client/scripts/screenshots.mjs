/**
 * Captures every main screen for each role at 375px and 1280px.
 *
 *   node scripts/screenshots.mjs <outDir> [--before]
 *   BASE_URL=http://localhost:5173 node scripts/screenshots.mjs ../screenshots/after
 *
 * Uses the locally installed Chrome (channel "chrome"), so no browser download is needed.
 * Note: the waiter result screens create receipts / award points in the demo database.
 */
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const OUT = resolve(process.argv[2] ?? '../screenshots/after');
const BEFORE = process.argv.includes('--before');
const PASSWORD = 'demo1234';
const DEMO_CODE = 'DEMO-GOST-2026';

const VIEWPORTS = {
  375: { width: 375, height: 812 },
  1280: { width: 1280, height: 800 },
};

const ACCOUNTS = {
  guest: 'gost@example.com',
  waiter: 'konobar.centar@mandrac.hr',
  owner: 'owner@mandrac.hr',
};

async function api(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

const tokens = {};
async function tokenFor(role) {
  tokens[role] ??= (await api('/auth/login', { method: 'POST', body: { email: ACCOUNTS[role], password: PASSWORD } })).token;
  return tokens[role];
}

/** Issue a fresh receipt so the award screens always have something to score. */
async function freshReceipt() {
  const token = await tokenFor('waiter');
  const products = await api('/waiter/products', { token });
  const pick = (name) => products.find((p) => p.name === name) ?? products[0];
  return api('/waiter/receipts', {
    token,
    method: 'POST',
    body: { items: [{ productId: pick('Cappuccino').id, quantity: 2 }, { productId: pick('Cijeđena naranča').id, quantity: 2 }] },
  });
}

async function enterCode(page, code) {
  const input = page.locator('input[aria-label="Kod gosta"]');
  await input.fill(code);
  await input.press('Enter');
}

const waiterRegisterPath = BEFORE ? '/konobar' : '/konobar/blagajna';

const SHOTS = [
  { name: 'public-landing', path: '/' },
  { name: 'public-login', path: '/login' },
  { name: 'public-register', path: '/r/mandrac' },

  { name: 'guest-card', role: 'guest', path: '/gost' },
  { name: 'guest-rewards', role: 'guest', path: '/gost/nagrade' },
  { name: 'guest-history', role: 'guest', path: '/gost/povijest' },

  ...(BEFORE ? [] : [{ name: 'waiter-home', role: 'waiter', path: '/konobar' }]),
  { name: 'waiter-register', role: 'waiter', path: waiterRegisterPath },
  { name: 'waiter-award', role: 'waiter', path: '/konobar/bodovi' },
  {
    name: 'waiter-award-success',
    role: 'waiter',
    path: async () => `/konobar/bodovi?racun=${(await freshReceipt()).id}`,
    action: async (page) => {
      await page.locator('[role="radio"][aria-checked="true"]').first().waitFor();
      await enterCode(page, DEMO_CODE);
      await page.getByText(/dodijeljen|ne nosi bodove/).first().waitFor();
    },
  },
  {
    name: 'waiter-award-rejected',
    role: 'waiter',
    path: async () => `/konobar/bodovi?racun=${(await freshReceipt()).id}`,
    action: async (page) => {
      await page.locator('[role="radio"][aria-checked="true"]').first().waitFor();
      await enterCode(page, 'ABCD-EFGH-JKMN');
      await page.getByText('Bodovi nisu dodijeljeni').first().waitFor();
    },
  },
  {
    name: 'waiter-redeem',
    role: 'waiter',
    path: '/konobar/nagrade',
    action: async (page) => {
      await enterCode(page, DEMO_CODE);
      await page.getByText('važećih bodova').first().waitFor();
    },
  },

  { name: 'owner-overview', role: 'owner', path: '/vlasnik' },
  { name: 'owner-top-guests', role: 'owner', path: '/vlasnik/gosti' },
  { name: 'owner-activity', role: 'owner', path: '/vlasnik/aktivnost' },
  { name: 'owner-settings', role: 'owner', path: '/vlasnik/postavke' },
  { name: 'owner-rewards', role: 'owner', path: '/vlasnik/nagrade' },
  { name: 'owner-products', role: 'owner', path: '/vlasnik/cjenik' },
  { name: 'owner-locations', role: 'owner', path: '/vlasnik/lokacije' },
  { name: 'owner-more', role: 'owner', path: '/vlasnik/vise', only: 375 },
];

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForFunction(() => !document.querySelector('.animate-shimmer, [aria-label="Učitavanje"]'), null, { timeout: 10_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const filter = process.env.ONLY ? new RegExp(process.env.ONLY) : null;

  for (const [width, viewport] of Object.entries(VIEWPORTS)) {
    for (const shot of SHOTS) {
      if (shot.only && String(shot.only) !== width) continue;
      if (filter && !filter.test(shot.name)) continue;
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce', locale: 'hr-HR', timezoneId: 'Europe/Zagreb' });
      if (shot.role) {
        const token = await tokenFor(shot.role);
        await context.addInitScript((t) => localStorage.setItem('mandrac.token', t), token);
      }
      const page = await context.newPage();
      const path = typeof shot.path === 'function' ? await shot.path() : shot.path;
      try {
        await page.goto(`${BASE}${path}`);
        await settle(page);
        if (shot.action) {
          await shot.action(page);
          await settle(page);
        }
        // Grow the viewport to the full page height so fixed bars (bottom nav) sit at the real bottom.
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, height) });
        await page.waitForTimeout(150);
        const file = `${OUT}/${shot.name}-${width}.png`;
        await page.screenshot({ path: file });
        console.log('✓', file);
      } catch (err) {
        console.error('✗', shot.name, width, err.message);
      } finally {
        await context.close();
      }
    }
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
