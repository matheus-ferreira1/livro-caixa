import { translator } from '@livro-caixa/domain';
import { instanceLanguage } from '@/shared/i18n/language-source';

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

/** The server's own errors arrive translated; this one is raised here, when it cannot be reached. */
const fallbackMessage = () => translator(instanceLanguage())('api.unreachable');

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      headers: { 'content-type': 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError(0, 'network_error', fallbackMessage());
  }
  if (response.status === 204) return null as T;
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const { error } = body as ErrorBody;
    throw new ApiError(response.status, error?.code ?? 'unknown_error', error?.message ?? fallbackMessage());
  }
  return body as T;
}

export const jsonBody = (data: unknown): RequestInit => ({ body: JSON.stringify(data) });
