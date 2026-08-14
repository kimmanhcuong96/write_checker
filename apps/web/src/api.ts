import type { ApiError } from "./types";

export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/$/u, "") ?? "http://localhost:8787";

export class RequestError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number, public readonly requestId?: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const isEvaluation = init?.method === "POST" && (path === "/api/evaluations" || /^\/api\/practice\/sessions\/[^/]+\/submit$/u.test(path));
  const timeoutMs = isEvaluation ? 70_000 : 20_000;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
  const response = await fetch(`${API_ORIGIN}${path}`, { ...init, signal, credentials: "include", headers: { "content-type": "application/json", ...init?.headers } });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const candidate = payload as Partial<ApiError>;
    throw new RequestError(candidate.error?.code ?? "UNKNOWN_ERROR", candidate.error?.message ?? "Something went wrong.", response.status, candidate.error?.requestId);
  }
  return payload as T;
}
