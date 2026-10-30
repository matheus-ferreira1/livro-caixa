import { MutationCache, QueryCache, QueryClient, type DefaultOptions } from '@tanstack/react-query';
import { ApiError } from './client';

const UNAUTHORIZED_STATUS = 401;
const MAX_QUERY_RETRIES = 3;

/** Mutation meta for requests whose 401 is an expected answer (wrong credentials), not an expired session. */
export const IGNORE_UNAUTHORIZED = { ignoreUnauthorized: true } as const;

export const isUnauthorized = (error: unknown): boolean =>
  error instanceof ApiError && error.status === UNAUTHORIZED_STATUS;

interface QueryClientOptions {
  onUnauthorized: (queryClient: QueryClient) => void;
  defaultOptions?: DefaultOptions;
}

export function createQueryClient({ onUnauthorized, defaultOptions }: QueryClientOptions): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isUnauthorized(error)) onUnauthorized(queryClient);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (isUnauthorized(error) && !mutation.meta?.ignoreUnauthorized) onUnauthorized(queryClient);
      },
    }),
    defaultOptions: {
      ...defaultOptions,
      queries: {
        refetchOnWindowFocus: false,
        // Retrying a 401 only delays the redirect to the sign-in screen.
        retry: (failureCount, error) => !isUnauthorized(error) && failureCount < MAX_QUERY_RETRIES,
        ...defaultOptions?.queries,
      },
    },
  });
  return queryClient;
}
