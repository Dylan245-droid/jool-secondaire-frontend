export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8007/api/v2"

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Netflix-style session rotation : sur 401 (hors login/2FA/refresh), un seul
// POST /auth/refresh est déclenché (single-flight), puis la requête est rejouée.
let refreshPromise: Promise<boolean> | null = null;

const SKIP_REFRESH = ["/auth/refresh", "/auth/login", "/auth/verify-2fa"];

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function rawFetch(path: string, options: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res = await rawFetch(path, options);

  if (res.status === 401 && !SKIP_REFRESH.includes(path)) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawFetch(path, options);
    }
    // Si le refresh échoue, l'erreur 401 remonte ; le middleware redirigera
    // vers /login dès que le cookie de refresh aura expiré côté navigateur.
  }

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || body.error || detail
    } catch {
      // corps non JSON
    }
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail))
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
}
