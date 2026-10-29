export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string };
}

const FALLBACK_MESSAGE = 'Não foi possível falar com o servidor. Tente novamente.';

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      headers: { 'content-type': 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError(0, 'network_error', FALLBACK_MESSAGE);
  }
  if (response.status === 204) return null as T;
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const { error } = body as ErrorBody;
    throw new ApiError(response.status, error?.code ?? 'unknown_error', error?.message ?? FALLBACK_MESSAGE);
  }
  return body as T;
}

export const jsonBody = (data: unknown): RequestInit => ({ body: JSON.stringify(data) });
