import { Router } from 'express';
import { prisma } from '../db.js';
import { notFound } from '../lib/http.js';

export const publicRouter = Router();

/** Minimal public info for the registration page behind the bar QR code. */
publicRouter.get('/tenants/:slug', async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: req.params.slug },
    select: {
      name: true,
      slug: true,
      locations: { where: { programEnabled: true }, select: { name: true }, orderBy: { name: 'asc' } },
      rewards: { where: { active: true }, select: { name: true, pointsCost: true }, orderBy: { pointsCost: 'asc' } },
      settings: { select: { earningMode: true, pointsPerEuro: true } },
    },
  });
  if (!tenant) throw notFound('Program vjernosti nije pronađen.');
  res.json({
    ...tenant,
    settings: tenant.settings && { ...tenant.settings, pointsPerEuro: Number(tenant.settings.pointsPerEuro) },
  });
});
