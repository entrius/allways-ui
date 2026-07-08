import { keepPreviousData, useQuery } from '@tanstack/react-query';
import axios, { type AxiosError } from 'axios';
import JSONbig from 'json-bigint';

// int64 swap ids and u64/u128 on-chain amounts exceed JS Number precision
// (2^53), so a plain JSON.parse silently corrupts their low digits. Parse any
// JSON number that would lose precision as a string instead — small numbers
// (uids, counts, floats) still come through as numbers, so response types are
// unchanged for every well-behaved field.
const preciseJson = JSONbig({ storeAsString: true });

const parsePrecise = (data: unknown): unknown => {
  if (typeof data !== 'string' || !data) return data;
  try {
    return preciseJson.parse(data);
  } catch {
    // Non-JSON body (error pages etc.) — hand it through untouched; the
    // content-type check below rejects it with a clear error.
    return data;
  }
};

export const useApiQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
  enabled?: boolean,
) => {
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;

  return useQuery<TResponse, AxiosError, TSelect>({
    queryKey: [queryName, url, queryParams],
    queryFn: async () => {
      const requestUrl = baseUrl ? `${baseUrl}${url}` : url;
      const response = await axios.get(requestUrl, {
        params: queryParams,
        transformResponse: parsePrecise,
      });
      const contentType = String(response.headers['content-type'] ?? '');
      if (!contentType.includes('application/json')) {
        throw new Error(
          `Expected JSON from ${requestUrl}, got ${contentType || 'unknown'}`,
        );
      }
      return response.data;
    },
    retry: false,
    enabled: enabled ?? true,
    refetchInterval: refetchInterval ?? false,
    placeholderData: keepPreviousData,
  });
};
