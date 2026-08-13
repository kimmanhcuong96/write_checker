import type { ApiError } from "./types";

export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/$/u, "") ?? "http://localhost:8787";

export class RequestError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number, public readonly requestId?: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_ORIGIN}${path}`, { ...init, credentials: "include", headers: { "content-type": "application/json", ...init?.headers } });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const candidate = payload as Partial<ApiError>;
    throw new RequestError(candidate.error?.code ?? "UNKNOWN_ERROR", candidate.error?.message ?? "Something went wrong.", response.status, candidate.error?.requestId);
  }
  return payload as T;
}
