export type DashboardStats = {
  totalSwaps: number;
  totalVolumeTao: string;
  activeMiners: number;
  activeSwaps: number;
};

/**
 * One gap-filled bucket from `GET /history`. Money fields are strings (parse
 * with Number/parseFloat); `successRate`/`avgSettlementSecs` can be null.
 * Rows arrive newest-last.
 */
export type HistoryRow = {
  t: string;
  volumeTao: string;
  cumulativeVolumeTao: string;
  swaps: number;
  cumulativeSwaps: number;
  feesTao: string;
  // NOTE: cumulativeFeesTao is intentionally unused — it carries a bogus
  // seed offset on prod. Per-bucket feesTao is fine.
  cumulativeFeesTao: string;
  tps: number;
  successRate: number | null;
  avgSettlementSecs: number | null;
};

/** One bucket from `GET /history/state` — point-in-time network levels. */
export type HistoryStateRow = {
  t: string;
  activeNodes: number;
  inFlight: number;
};
