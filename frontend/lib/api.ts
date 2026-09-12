import { API_BASE } from "./config";
import { getAccessToken } from "./auth-token";
import { readSession } from "./session";

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

function withTimeoutSignal(init: RequestInit = {}): RequestInit {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  if (init.signal) return { ...init, signal: AbortSignal.any([init.signal, timeoutSignal]) };
  return { ...init, signal: timeoutSignal };
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
  return data as T;
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
