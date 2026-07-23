import { useMemo } from 'react';
import { useMiners } from '../api';

// Every spoke chain with registered miners is a listable pair — the list
// grows on its own as new chains come online. `pin` (a URL-selected pair)
// is always included so a deep link never loses its market; until miners
// load, the two launch pairs stand in.
export const useSpokes = (pin?: string): string[] => {
  const { data: miners } = useMiners();
  return useMemo(() => {
    const found = new Set<string>();
    (miners ?? []).forEach((m) => {
      [m.sourceChain, m.destChain]
        .map((c) => c?.toLowerCase())
        .filter((c): c is string => !!c && c !== 'sol')
        .forEach((c) => found.add(c));
    });
    if (pin) found.add(pin);
    return found.size > (pin ? 1 : 0) || miners?.length
      ? [...found].sort()
      : ['btc', 'tao'];
  }, [miners, pin]);
};
