import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { HttpError } from '../lib/http.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export const toUserDto = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  tenantId: u.tenantId,
  locationId: u.locationId,
});

/**
 * Authenticates the request and checks the role. The user (incl. tenantId and locationId)
 * is always re-loaded from the database — tenant/location are never taken from the client.
 */
export function requireAuth(...roles) {
  return async (req, _res, next) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'UNAUTHENTICATED', 'Prijavite se.');

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Sesija je istekla. Prijavite se ponovno.');
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) throw new HttpError(401, 'UNAUTHENTICATED', 'Korisnički račun nije aktivan.');
    if (roles.length && !roles.includes(user.role)) throw new HttpError(403, 'FORBIDDEN', 'Nemate pristup ovoj stranici.');
    if (user.role !== 'SUPERADMIN' && !user.tenantId) throw new HttpError(403, 'FORBIDDEN', 'Korisnik nije vezan uz firmu.');
    if (user.role === 'WAITER' && !user.locationId) throw new HttpError(403, 'FORBIDDEN', 'Konobar nije vezan uz lokaciju.');

    req.user = user;
    next();
  };
}
