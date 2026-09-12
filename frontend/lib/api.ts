import { API_BASE } from "./config";
import { getAccessToken } from "./auth-token";
import { readSession } from "./session";
import { cacheKey, getCached, isFresh, setCached, shouldCache, invalidateApiCache } from "./api-cache";

export class ApiError extends Error {
  status: number;
  details: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const REQUEST_TIMEOUT_MS = 12_000;
const NETWORK_CAP_MS = 1_500;
const STALE_SENTINEL = Symbol("stale");

function withTimeoutSignal(init: RequestInit = {}): RequestInit {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  if (init.signal) return { ...init, signal: AbortSignal.any([init.signal, timeoutSignal]) };
  return { ...init, signal: timeoutSignal };
}

function sleep(ms: number) {
  return new Promise<typeof STALE_SENTINEL>((resolve) => setTimeout(() => resolve(STALE_SENTINEL), ms));
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = readSession();
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }
  const bearer = getAccessToken() || session?.accessToken || session?.clerkToken;
  if (bearer) {
    headers.set("authorization", `Bearer ${bearer}`);
  } else if (session?.userId) {
    headers.set("x-dev-user-id", session.userId);
  }

  const method = (init.method ?? "GET").toUpperCase();
  const key = cacheKey(session?.userId, method, path);
  const cacheable = shouldCache(method, path);

  const fetchIt = async (): Promise<T> => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...withTimeoutSignal(init),
      headers,
      cache: "no-store",
    });

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const message =
        typeof data === "object" && data && "message" in data
          ? String((data as { message: unknown }).message)
          : res.statusText;
      throw new ApiError(res.status, message, data);
    }

    if (cacheable) {
      setCached(key, data);
    } else if (method !== "GET") {
      // Targeted invalidation — wiping the entire cache on every POST made page
      // switches wait on cold network fetches again.
      if (path.includes("/comments")) {
        invalidateApiCache(/\/teams(\/|$)/);
      } else if (path.includes("/mentors")) {
        invalidateApiCache(/\/(teams|mentors)(\/|$)/);
      } else if (path.includes("/teams")) {
        invalidateApiCache(/\/teams(\/|$)/);
      } else if (path.includes("/idea-submissions") || path.includes("/problem-statements")) {
        invalidateApiCache(/\/(teams|problem-statements|idea-submissions)(\/|$)/);
      } else {
        invalidateApiCache(/\/teams(\/|$)/);
      }
    }
    return data as T;
  };

  if (cacheable && typeof window !== "undefined") {
    const entry = getCached<T>(key);
    if (entry) {
      if (isFresh(entry)) return entry.data;
      const background = fetchIt().catch(() => undefined);
      const winner = await Promise.race([background, sleep(NETWORK_CAP_MS)]);
      if (winner !== undefined && winner !== STALE_SENTINEL) return winner as T;
      return entry.data;
    }
  }

  return fetchIt();
}

export function apiPost<T>(path: string, body: unknown) {
  return api<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown) {
  return api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string) {
  return api<T>(path, { method: "DELETE" });
}

export async function apiBlob(path: string) {
  const session = readSession();
  const headers = new Headers();
  const bearer = getAccessToken() || session?.accessToken || session?.clerkToken;
  if (bearer) headers.set("authorization", `Bearer ${bearer}`);
  else if (session?.userId) headers.set("x-dev-user-id", session.userId);
  const res = await fetch(`${API_BASE}${path}`, {
    ...withTimeoutSignal(),
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return res.blob();
}
