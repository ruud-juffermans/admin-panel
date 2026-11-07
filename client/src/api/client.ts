// Same-origin API: in production the panel server serves this build and the
// API from one origin; in dev Vite proxies /api and /auth to it (vite.config.ts).
const base = '';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// A 401 anywhere means the session cookie is gone (expired, or the secret was
// rotated). The auth provider listens and drops back to the login page.
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export async function request<T>(path: string, init?: RequestInit & { silent401?: boolean }): Promise<T> {
  const { silent401, ...rest } = init ?? {};
  const res = await fetch(`${base}${path}`, {
    ...rest,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(rest.headers ?? {}) },
  });
  if (res.status === 401 && !silent401) {
    for (const listener of unauthorizedListeners) listener();
  }
  if (!res.ok) {
    let message = res.statusText;
    const text = await res.text();
    if (text) {
      try {
        message = (JSON.parse(text) as { error?: string }).error ?? text;
      } catch {
        message = text;
      }
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const get = <T>(path: string) => request<T>(path);
export const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

export function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}
