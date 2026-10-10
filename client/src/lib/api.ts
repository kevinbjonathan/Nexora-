import type { ApiErrorBody, ApiErrorCode } from './types';
import { ApiError } from './types';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ? import.meta.env.VITE_SOCKET_URL.replace(/\/$/, '') : API_BASE_URL;

export type Query = Record<string, string | number | boolean | null | undefined>;

function buildQuery(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue;
    params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

const unauthListeners = new Set<() => void>();
/** Subscribe to global "session expired" events (fired on any 401 UNAUTHENTICATED). */
export function onApiUnauthenticated(listener: () => void): () => void {
  unauthListeners.add(listener);
  return () => unauthListeners.delete(listener);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(
      'INTERNAL_ERROR',
      `Unable to reach the Nexora API at ${API_BASE_URL}. Check that the server is running.`,
      500,
    );
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  if (response.ok) return json as T;

  let code: ApiErrorCode = 'INTERNAL_ERROR';
  let message = `Request failed with status ${response.status}.`;
  let details: unknown;
  if (json && typeof json === 'object' && (json as ApiErrorBody).error) {
    const body = json as ApiErrorBody;
    code = body.error.code;
    message = body.error.message;
    details = body.error.details;
  }

  if (code === 'UNAUTHENTICATED') unauthListeners.forEach((l) => l());

  throw new ApiError(code, message, response.status, details);
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path + buildQuery(query)),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};