import { useApiQuery } from './ApiUtils';
import { type PriceSnapshot } from './models';
import { type UsdPrices } from '../utils/format';

// das refreshes bidaily; an hourly client refetch is already generous.
const PRICES_REFETCH_MS = 60 * 60 * 1000;

export const usePrices = () =>
  useApiQuery<PriceSnapshot>('prices', '/prices', PRICES_REFETCH_MS);

// Convenience for display sites: the per-chain USD map, empty while loading,
// on error, or against a das that predates GET /prices — every conversion
// then yields null and callers fall back to native (SOL/TAO) rendering.
export const useUsdPrices = (): UsdPrices => {
  const { data } = usePrices();
  return data?.prices ?? {};
};
