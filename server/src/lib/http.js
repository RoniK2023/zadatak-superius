import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const badRequest = (message, extra) => new HttpError(400, 'BAD_REQUEST', message, extra);
export const notFound = (message = 'Nije pronađeno.') => new HttpError(404, 'NOT_FOUND', message);
export const forbidden = (message = 'Nemate pristup.') => new HttpError(403, 'FORBIDDEN', message);
export const conflict = (code, message) => new HttpError(409, code, message);

/** Parse with zod and turn errors into a 400 with per-field messages. */
export function parse(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] ??= issue.message;
    }
    throw badRequest('Provjerite unesene podatke.', { fields });
  }
  return result.data;
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.extra } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Neispravan zahtjev.' } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Neispravan JSON.' } });
  }
  console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Došlo je do greške na poslužitelju.' } });
}
