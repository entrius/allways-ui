import { useMemo } from 'react';
import { useCurrentMinerScores, useMinerScores } from '../../api';
import type { EligibilityState } from './EligibilityChip';

// Freshest strike-gate verdict available for a miner, pair-agnostic: the live
// mid-round tip when the miner holds crown (tip rows only exist for holders),
// else the latest flushed round. `live` distinguishes the two for display.
export const useMinerEligibility = (
  hotkey: string,
): { state: EligibilityState; live: boolean; asOf: number | null } => {
  const { data: tip } = useCurrentMinerScores(hotkey);
  const { data: history } = useMinerScores(hotkey);
  return useMemo(() => {
    if (tip?.length) {
      return {
        state: tip.every((r) => r.eligible)
          ? ('eligible' as const)
          : ('ineligible' as const),
        live: true,
        asOf: tip.reduce((m, r) => Math.max(m, r.ts), 0),
      };
    }
    if (history?.length) {
      // Rows arrive roundTs ASC; the verdict is the last round's row set.
      const lastTs = history[history.length - 1].roundTs;
      const lastRows = history.filter((r) => r.roundTs === lastTs);
      return {
        state: lastRows.every((r) => r.eligible)
          ? ('eligible' as const)
          : ('ineligible' as const),
        live: false,
        asOf: lastTs,
      };
    }
    return { state: 'none' as const, live: false, asOf: null };
  }, [tip, history]);
};
