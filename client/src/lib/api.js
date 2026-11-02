const TOKEN_KEY = 'mandrac.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

/** Thin fetch wrapper: JSON in/out, bearer token, Croatian error messages from the API. */
export async function api(path, { method = 'GET', body, query, raw = false } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });

  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Nema veze s poslužiteljem. Provjerite internetsku vezu.');
  }

  if (res.status === 401 && token) onUnauthorized();
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      data.error?.code ?? 'ERROR',
      data.error?.message ?? 'Nešto je pošlo po zlu. Pokušajte ponovno.',
      data.error?.fields,
    );
  }
  if (raw) return res;
  if (res.status === 204) return null;
  return res.json();
}
