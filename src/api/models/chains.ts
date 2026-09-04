import seed from './chains.seed.json';

// Chain metadata as served by das GET /chains. The committed seed renders the
// known chains through a das outage; useChains() (ChainsApi) refreshes this
// registry from the live endpoint, so a chain added to das appears everywhere
// with zero UI edits.
export interface ChainInfo {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  displayDigits: number;
  family: string;
  hub: boolean;
  // Path on das, e.g. "/chains/logos/sol.png".
  logo: string;
  // {hash} template resolved for the deployment's network, or null.
  explorerTx: string | null;
  // Average seconds per block and the confirmation depth validators wait for
  // before accepting a deposit (mirror of allways/chains.py seconds_per_block
  // + min_confirmations). Together they bound how long a swap sits PENDING.
  blockSecs: number;
  confirmations: number;
  // Fields newer das releases serve; absent from the committed seed.
  // Human name of the network the asset lives on ("Base", "Solana").
  network?: string;
  coingeckoId?: string | null;
  // Set for EVM assets; `contract` is null for a network's native coin.
  evm?: { chainId: number; contract: string | null } | null;
}

let registry: ChainInfo[] = seed.chains;

export const setChains = (chains: ChainInfo[]): void => {
  if (chains.some((c) => c.hub)) registry = chains;
};

export const chainList = (): ChainInfo[] => registry;

export const chainInfo = (
  id: string | null | undefined,
): ChainInfo | undefined =>
  registry.find((c) => c.id === (id ?? '').toLowerCase());

// PRIORITY-ORDERED hub list — das payload order IS the priority order
// (mirror of allways.constants.HUB_CHAINS).
export const hubChains = (chains: ChainInfo[] = registry): string[] =>
  chains.filter((c) => c.hub).map((c) => c.id);

// The PRIMARY hub — the Solana settlement chain (protocol addresses, program
// tx links, reservation fees). Pair-scoped logic wants hubLeg, not this.
export const hubChain = (): string => hubChains()[0];

// The pair's hub anchor — its canonical rate source and pricing leg: the
// first hub (priority order) on either leg; null for spoke↔spoke (invalid).
export const hubLeg = (
  a: string,
  b: string,
  chains: ChainInfo[] = registry,
): string | null => hubChains(chains).find((h) => h === a || h === b) ?? null;

export const spokeChains = (): string[] =>
  registry.filter((c) => !c.hub).map((c) => c.id);

// Canonical render order — hubs pair against every other chain, each pair
// landing once under its highest-priority hub with the hub (canonical-source)
// leg first. Mirror of allways.chains.canonical_pair / das deriveDirections.
export const allDirections = (chains: ChainInfo[] = registry): string[] => {
  const seen = new Set<string>();
  return chains
    .filter((c) => c.hub)
    .flatMap((hub) =>
      chains
        .filter((other) => {
          if (other.id === hub.id) return false;
          const pair = [hub.id, other.id].sort().join('|');
          if (seen.has(pair)) return false;
          seen.add(pair);
          return true;
        })
        .flatMap((spoke) => [
          `${hub.id}-${spoke.id}`.toUpperCase(),
          `${spoke.id}-${hub.id}`.toUpperCase(),
        ]),
    );
};

// A chain is a TOKEN on its network (rather than the network's native coin)
// when it is an EVM contract, or when the same asset (by CoinGecko id) is
// listed on more than one network — which is how Solana USDC is told apart
// from SOL itself. Mirror of allways-matrix rates.isToken.
export const isToken = (
  c: ChainInfo,
  chains: ChainInfo[] = registry,
): boolean =>
  !!c.evm?.contract ||
  (!!c.coingeckoId &&
    chains.some(
      (o) =>
        o.id !== c.id &&
        o.coingeckoId === c.coingeckoId &&
        o.network !== c.network,
    ));

// The native coin of a token's network, if das lists one (ETH for the
// Ethereum deployments, SOL for Solana USDC). Base and Arbitrum have no
// native listing, so their marks come from local art.
export const nativeOf = (
  c: ChainInfo,
  chains: ChainInfo[] = registry,
): ChainInfo | undefined =>
  chains.find(
    (o) => o.id !== c.id && o.network === c.network && !isToken(o, chains),
  );
