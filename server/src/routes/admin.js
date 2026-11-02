import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

/** Superadmin (Superius): read-only list of tenants. Onboarding happens through the seed in the MVP. */
export const adminRouter = Router();
adminRouter.use(requireAuth('SUPERADMIN'));

adminRouter.get('/tenants', async (_req, res) => {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { locations: true, guestProfiles: true, transactions: true } },
      users: { where: { role: 'OWNER' }, select: { name: true, email: true } },
    },
  });
  res.json(
    tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      createdAt: t.createdAt,
      owners: t.users,
      locations: t._count.locations,
      members: t._count.guestProfiles,
      transactions: t._count.transactions,
    })),
  );
});
