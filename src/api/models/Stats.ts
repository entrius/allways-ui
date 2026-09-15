export type DashboardStats = {
  totalSwaps: number;
  totalVolumeSol: string;
  // Completed volume per backing, each in its own smallest unit. Absent on a
  // das that predates the per-backing aggregates; never sum across keys.
  totalVolumeByBacking?: Record<string, string>;
  // Point-in-time USD (absent on a das that predates usd_price_history):
  // every completed swap at its backing's price in the hour it resolved.
  // unpricedSwaps counts completed swaps with no price on record, which the
  // totals leave out.
  totalVolumeUsd?: number;
  totalFeesUsd?: number;
  largestSwapUsd?: number | null;
  unpricedSwaps?: number;
  activeMiners: number;
  activeSwaps: number;
};

/**
 * One gap-filled bucket from `GET /history`. Money fields are strings (parse
 * with Number/parseFloat); `successRate`/`avgSettlementSecs`/
 * `medianSettlementSecs` can be null.
 * Rows arrive newest-last.
 */
export type HistoryRow = {
  t: string;
  volumeSol: string;
  cumulativeVolumeSol: string;
  swaps: number;
  cumulativeSwaps: number;
  feesSol: string;
  // NOTE: cumulativeFeesSol is intentionally unused — it carries a bogus
  // seed offset on prod. Per-bucket feesSol is fine.
  cumulativeFeesSol: string;
  // Per-backing counterparts (absent on older das): each key in its own
  // smallest unit — never sum across keys.
  volumeByBacking?: Record<string, string>;
  cumulativeVolumeByBacking?: Record<string, string>;
  feesByBacking?: Record<string, string>;
  cumulativeFeesByBacking?: Record<string, string>;
  // Point-in-time USD per bucket (absent on an older das): each swap at
  // the price of the hour it resolved, so history keeps the price of its
  // day. unpricedSwaps are left out of the sums.
  volumeUsd?: number;
  cumulativeVolumeUsd?: number;
  feesUsd?: number;
  cumulativeFeesUsd?: number;
  unpricedSwaps?: number;
  tps: number;
  successRate: number | null;
  avgSettlementSecs: number | null;
  // The typical swap's settlement, unmoved by one slow outlier. Absent on a
  // das that predates the percentile aggregate.
  medianSettlementSecs?: number | null;
};

/** One bucket from `GET /history/state` — point-in-time network levels. */
export type HistoryStateRow = {
  t: string;
  activeNodes: number;
  inFlight: number;
};
