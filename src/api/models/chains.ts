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

export const hubChain = (): string => registry.find((c) => c.hub)!.id;

export const spokeChains = (): string[] =>
  registry.filter((c) => !c.hub).map((c) => c.id);

// Canonical render order — pairs kept together, forward (hub→spoke) leg first.
export const allDirections = (chains: ChainInfo[] = registry): string[] => {
  const hub = chains.find((c) => c.hub)!.id;
  return chains
    .filter((c) => !c.hub)
    .flatMap((c) => [
      `${hub}-${c.id}`.toUpperCase(),
      `${c.id}-${hub}`.toUpperCase(),
    ]);
};
