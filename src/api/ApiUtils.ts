import { keepPreviousData, useQuery } from '@tanstack/react-query';
import axios, { type AxiosError } from 'axios';

export const useApiQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
  enabled?: boolean,
) => {
  const rawBase = import.meta.env.VITE_REACT_APP_BASE_URL;
  const baseUrl = typeof rawBase === 'string' ? rawBase.trim() : '';

  return useQuery<TResponse, AxiosError, TSelect>({
    queryKey: [queryName, url, queryParams],
    queryFn: async () => {
      const requestUrl = baseUrl ? `${baseUrl}${url}` : url;
      const response = await axios.get(requestUrl, { params: queryParams });
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
