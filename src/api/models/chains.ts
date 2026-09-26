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

// A subnet alpha (sn7, sn74) — pairs with SOL or a spoke, always TAO-backed.
export const isAlpha = (id: string): boolean => /^sn[0-9]+$/.test(id);

// The chain a leg settles in: an alpha settles in TAO. Mirror of allways.constants.family.
const backingFamily = (id: string): string => (isAlpha(id) ? 'tao' : id);

// TAO↔alpha or alpha↔alpha: a native subtensor stake/unstake, never routed
// here. Mirror of allways.constants.is_native_swap.
export const isNativeSwap = (a: string, b: string): boolean =>
  (isAlpha(a) || isAlpha(b)) && backingFamily(a) === backingFamily(b);

// The pair's anchor — its canonical rate source and pricing leg: the first
// hub (priority order) on either leg, else the alpha leg of an alpha↔spoke
// pair; null for spoke↔spoke or a native pair (invalid). Mirror of allways.constants.hub_leg.
export const hubLeg = (
  a: string,
  b: string,
  chains: ChainInfo[] = registry,
): string | null =>
  isNativeSwap(a, b)
    ? null
    : (hubChains(chains).find((h) => h === a || h === b) ??
      (isAlpha(a) !== isAlpha(b) ? (isAlpha(a) ? a : b) : null));

// The purse a pair's quotes are backed by: TAO for any alpha pair, else the
// given hub (the pair's hub leg, or for sol↔tao the lane being viewed).
// Mirror of das declarableBackings[0] / allways.constants.declarable_backings.
export const pairBacking = (a: string, b: string, hub: string): string =>
  isAlpha(a) || isAlpha(b) ? 'tao' : hub;

// The emission family a pair scores in: 'alpha' when either leg is an alpha,
// else its hub leg. Each family gets an equal share of the miner pool.
export const scoringFamily = (
  a: string,
  b: string,
  chains: ChainInfo[] = registry,
): string | null => (isAlpha(a) || isAlpha(b) ? 'alpha' : hubLeg(a, b, chains));

export const spokeChains = (): string[] =>
  registry.filter((c) => !c.hub).map((c) => c.id);

// Canonical render order, anchor (canonical-source) leg first: each hub
// against every other chain (a pair lands once, under its highest-priority
// hub; native pairs skipped), then each alpha against every spoke. Every valid
// pair, live or not.
// Mirror of allways.chains.canonical_pair / das deriveDirections.
export const allDirections = (chains: ChainInfo[] = registry): string[] => {
  const ids = chains.map((c) => c.id);
  const hubs = hubChains(chains);
  const alphas = ids.filter(isAlpha);
  const spokes = ids.filter((id) => !hubs.includes(id) && !isAlpha(id));
  const pairs = [
    ...hubs.flatMap((hub, i) =>
      ids
        .filter(
          (other) =>
            other !== hub &&
            !hubs.slice(0, i).includes(other) &&
            !isNativeSwap(hub, other),
        )
        .map((other) => [hub, other]),
    ),
    ...alphas.flatMap((alpha) => spokes.map((spoke) => [alpha, spoke])),
  ];
  return pairs.flatMap(([anchor, other]) => [
    `${anchor}-${other}`.toUpperCase(),
    `${other}-${anchor}`.toUpperCase(),
  ]);
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

// The asset's display name, carrying its network whenever the symbol is
// shared with another listing ("USDC (Arbitrum)", but plain "BTC"). The one
// label for asset names everywhere: the matrix, the book, detail pages.
export const assetLabel = (id: string, chains: ChainInfo[] = registry) => {
  const c = chainInfo(id);
  if (!c) return id.toUpperCase();
  const shared = chains.some((o) => o.id !== c.id && o.symbol === c.symbol);
  return shared && c.network ? `${c.symbol} (${c.network})` : c.symbol;
};
