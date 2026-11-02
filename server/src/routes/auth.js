import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { HttpError, conflict, notFound, parse } from '../lib/http.js';
import { generateQrToken } from '../lib/token.js';
import { requireAuth, signToken, toUserDto } from '../middleware/auth.js';

export const authRouter = Router();

const email = z.string().trim().toLowerCase().email('Unesite ispravnu email adresu.');

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Unesite lozinku.'),
});

authRouter.post('/login', async (req, res) => {
  const { email: mail, password } = parse(loginSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email: mail } });
  const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Pogrešan email ili lozinka.');
  res.json({ token: signToken(user), user: toUserDto(user) });
});

const registerSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  name: z.string().trim().min(2, 'Unesite ime (barem 2 znaka).').max(80),
  email,
  password: z.string().min(8, 'Lozinka mora imati barem 8 znakova.').max(100),
});

/** Guest self-registration from the QR code at the bar (/r/:tenantSlug). */
authRouter.post('/register', async (req, res) => {
  const data = parse(registerSchema, req.body);
  const tenant = await prisma.tenant.findUnique({ where: { slug: data.tenantSlug } });
  if (!tenant) throw notFound('Program vjernosti nije pronađen.');

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw conflict('EMAIL_TAKEN', 'Račun s ovim emailom već postoji. Prijavite se.');

  const passwordHash = await bcrypt.hash(data.password, 10);
  const now = new Date();
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: 'GUEST',
      tenantId: tenant.id,
      passwordHash,
      guestProfile: {
        create: { tenantId: tenant.id, qrToken: generateQrToken(), createdAt: now, lastResetAt: now },
      },
    },
  });
  res.status(201).json({ token: signToken(user), user: toUserDto(user) });
});

authRouter.get('/me', requireAuth(), async (req, res) => {
  const [tenant, location] = await Promise.all([
    req.user.tenantId
      ? prisma.tenant.findUnique({ where: { id: req.user.tenantId }, select: { name: true, slug: true } })
      : null,
    req.user.locationId
      ? prisma.location.findUnique({ where: { id: req.user.locationId }, select: { id: true, name: true } })
      : null,
  ]);
  res.json({ user: { ...toUserDto(req.user), tenant, location } });
});
