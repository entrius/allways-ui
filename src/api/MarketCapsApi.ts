import { useQuery } from '@tanstack/react-query';
import capsSeed from './models/caps.seed.json';
import supplySeed from './models/supply.seed.json';
import type { ChainInfo } from './models/chains';

// Row order for the rate matrix. das carries each chain's coingeckoId; the
// sizes come straight from public, CORS-open APIs in the browser, hourly.
// The committed seeds keep the order stable through an outage or a rate
// limit, and a failed refresh keeps whatever was last committed.

const REFRESH_MS = 3_600_000;

// CoinGecko id → USD market cap.
export type MarketCaps = Record<string, number>;
// Per-chain circulating supply for assets deployed on several chains,
// keyed coingeckoId → das `network` name → USD. Breaks ties inside a group
// like the USDC deployments, which all share one CoinGecko market cap.
export type ChainSupply = Record<string, Record<string, number>>;

// DefiLlama stablecoin ids for assets that exist on several chains, keyed by
// CoinGecko id. Add an entry when das lists a new multi-chain asset.
const LLAMA_STABLECOIN_IDS: Record<string, number> = { 'usd-coin': 2 };

const fetchMarketCaps = async (ids: string[]): Promise<MarketCaps> => {
  const unique = [...new Set(ids)].join(',');
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${unique}&per_page=250`,
    { headers: { accept: 'application/json' } },
  );
  if (!res.ok) throw new Error(`coingecko -> ${res.status}`);
  const rows = (await res.json()) as {
    id: string;
    market_cap: number | null;
  }[];
  return Object.fromEntries(rows.map((r) => [r.id, r.market_cap ?? 0]));
};

const fetchChainSupply = async (ids: string[]): Promise<ChainSupply> => {
  const out: ChainSupply = {};
  await Promise.all(
    ids.map(async (id) => {
      const llamaId = LLAMA_STABLECOIN_IDS[id];
      if (!llamaId) return;
      const res = await fetch(
        `https://stablecoins.llama.fi/stablecoin/${llamaId}`,
      );
      if (!res.ok) throw new Error(`defillama -> ${res.status}`);
      const data = (await res.json()) as {
        chainBalances: Record<
          string,
          { tokens: { circulating: { peggedUSD: number } }[] }
        >;
      };
      out[id] = Object.fromEntries(
        Object.entries(data.chainBalances).map(([chain, v]) => [
          chain,
          v.tokens[v.tokens.length - 1]?.circulating.peggedUSD ?? 0,
        ]),
      );
    }),
  );
  return out;
};

const geckoIds = (chains: ChainInfo[]): string[] =>
  chains.map((c) => c.coingeckoId).filter((id): id is string => !!id);

export const useMarketCaps = (chains: ChainInfo[]) => {
  const ids = geckoIds(chains);
  return useQuery<MarketCaps>({
    queryKey: ['market-caps', ids.join(',')],
    queryFn: () => fetchMarketCaps(ids),
    initialData: capsSeed as MarketCaps,
    initialDataUpdatedAt: 0,
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
    refetchOnMount: 'always',
    retry: false,
    enabled: ids.length > 0,
  });
};

// Only the assets listed on more than one network need a per-chain split.
export const useChainSupply = (chains: ChainInfo[]) => {
  const ids = geckoIds(chains);
  const shared = [
    ...new Set(ids.filter((id) => ids.indexOf(id) !== ids.lastIndexOf(id))),
  ];
  return useQuery<ChainSupply>({
    queryKey: ['chain-supply', shared.join(',')],
    queryFn: () => fetchChainSupply(shared),
    initialData: supplySeed as ChainSupply,
    initialDataUpdatedAt: 0,
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
    refetchOnMount: 'always',
    retry: false,
    enabled: shared.length > 0,
  });
};

// Hubs first (das priority order), then every other asset by market cap,
// largest first. Deployments of one asset (the USDC rows) stay together at
// the asset's rank and order by their own chain's supply; any remaining tie
// keeps das order. Mirror of allways-matrix rates.displayAssets.
export const orderByMarketCap = (
  chains: ChainInfo[],
  caps: MarketCaps,
  supply: ChainSupply,
): ChainInfo[] => {
  const cap = (c: ChainInfo) => (c.coingeckoId && caps[c.coingeckoId]) || 0;
  const onChain = (c: ChainInfo) =>
    (c.coingeckoId && c.network && supply[c.coingeckoId]?.[c.network]) || 0;
  const spokes = chains
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !c.hub)
    .sort(
      (a, b) => cap(b.c) - cap(a.c) || onChain(b.c) - onChain(a.c) || a.i - b.i,
    )
    .map(({ c }) => c);
  return [...chains.filter((c) => c.hub), ...spokes];
};
