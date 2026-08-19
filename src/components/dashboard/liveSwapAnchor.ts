import { useCallback, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiQueryOptions } from '../../api/ApiUtils';
import { SSE_FALLBACK_INTERVAL } from '../../api/constants';
import { useReservations } from '../../api';
import type { ActiveSwap, Reservation, SwapDetail } from '../../api/models';
import { isTerminal, toNum } from './txFilters';

// Everything an in-flight row needs that its swap record doesn't carry yet:
// the live reservation behind it, and the timestamp its "how long has this
// been going" counter runs from. The tape and the pulse both read from here
// so their elapsed numbers agree to the second.

// A pending/claimed swap's row is nearly empty until validator quorum, but
// its LIVE reservation already carries the pair, amounts, miner, and the
// proven from-wallet. SSE keeps this fresh.
export const useReservationLookup = (): ((
  swap: ActiveSwap,
) => Partial<Reservation> | undefined) => {
  const { data: reservations } = useReservations();

  const bySwapId = useMemo(() => {
    const map = new Map<string, Reservation>();
    for (const r of reservations ?? []) {
      if (r.swapId != null) map.set(r.swapId, r);
    }
    return map;
  }, [reservations]);

  // SwapClaimed-stage rows aren't linked yet (swap_id is stamped on the
  // reservation later), but the request hash embeds the user's protocol
  // address prefix ("<hash8>-<user8>"). One candidate → use it outright.
  // Several → never guess; show only the fields ALL candidates agree on
  // (same pair, same from-wallet — provable regardless of which one it is).
  const byUserPrefix = useMemo(() => {
    const byPrefix = new Map<string, Reservation[]>();
    for (const r of reservations ?? []) {
      if (r.swapId != null) continue;
      const prefix = r.requestHash?.split('-')[1];
      if (!prefix) continue;
      byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), r]);
    }
    const agreed = <K extends keyof Reservation>(
      rs: Reservation[],
      key: K,
    ): Reservation[K] | null =>
      rs.every((r) => r[key] === rs[0][key]) ? rs[0][key] : null;
    const map = new Map<string, Partial<Reservation>>();
    for (const [prefix, rs] of byPrefix) {
      map.set(
        prefix,
        rs.length === 1
          ? rs[0]
          : {
              fromChain: agreed(rs, 'fromChain'),
              toChain: agreed(rs, 'toChain'),
              fromAmount: agreed(rs, 'fromAmount'),
              toAmount: agreed(rs, 'toAmount'),
              minerHotkey: agreed(rs, 'minerHotkey') ?? undefined,
              userFromAddress: agreed(rs, 'userFromAddress') ?? undefined,
              reservedAt: agreed(rs, 'reservedAt') ?? undefined,
            },
      );
    }
    return map;
  }, [reservations]);

  return useCallback(
    (swap: ActiveSwap) =>
      isTerminal(swap)
        ? undefined
        : (bySwapId.get(swap.swapId) ??
          byUserPrefix.get(swap.userAddress?.slice(0, 8) ?? '') ??
          undefined),
    [bySwapId, byUserPrefix],
  );
};

// The one start time every elapsed readout runs from, in unix seconds:
//   1. initiatedAt — the on-chain quorum stamp, once it exists;
//   2. the live reservation's reservedAt, for a claim awaiting quorum;
//   3. the swap's earliest event blockTime — for a claim quorum NEVER
//      stamped (a reaped stale claim keeps its SwapClaimed event long after
//      its reservation is gone), fetched per in-flight row.
// 0 means no real timestamp exists anywhere; callers decide what to show.
export const useLiveAnchor = (
  swaps: ActiveSwap[] | undefined,
  reservationFor: (swap: ActiveSwap) => Partial<Reservation> | undefined,
): ((swap: ActiveSwap) => number) => {
  const stamped = useCallback(
    (swap: ActiveSwap): number =>
      toNum(swap.initiatedAt) ||
      toNum(reservationFor(swap)?.reservedAt ?? null),
    [reservationFor],
  );

  // Only unstamped in-flight rows need the detail fetch, and there are at
  // most a handful. Sorted so an unchanged set keeps a stable query list.
  const needDetail = useMemo(
    () =>
      (swaps ?? [])
        .filter((s) => !isTerminal(s) && !stamped(s))
        .map((s) => s.swapId)
        .sort(),
    [swaps, stamped],
  );

  const details = useQueries({
    queries: needDetail.map((swapId) =>
      apiQueryOptions<SwapDetail>(
        // Same key shape as useSwapDetail, so a row already showing its
        // timeline shares this fetch instead of doubling it.
        'swap',
        `/swaps/${swapId}`,
        SSE_FALLBACK_INTERVAL,
      ),
    ),
    combine: (results) => results.map((r) => r.data),
  });

  const claimedAt = useMemo(() => {
    const map = new Map<string, number>();
    details.forEach((detail, i) => {
      const times = (detail?.events ?? [])
        .map((e) => toNum(e.blockTime))
        .filter((t) => t > 0);
      if (times.length) map.set(needDetail[i], Math.min(...times));
    });
    return map;
  }, [details, needDetail]);

  return useCallback(
    (swap: ActiveSwap): number =>
      stamped(swap) || claimedAt.get(swap.swapId) || 0,
    [stamped, claimedAt],
  );
};
