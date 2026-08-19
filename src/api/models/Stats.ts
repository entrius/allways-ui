export type DashboardStats = {
  totalSwaps: number;
  totalVolumeSol: string;
  // Completed volume per backing, each in its own smallest unit. Absent on a
  // das that predates the per-backing aggregates; never sum across keys.
  totalVolumeByBacking?: Record<string, string>;
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
