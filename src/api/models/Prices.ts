// GET /prices — estimated USD price per chain id, refreshed bidaily on das
// from CoinGecko. null price = no USD venue for that chain, or das hasn't
// completed its first fetch yet; consumers fall back to native rendering.
export interface PriceSnapshot {
  prices: Record<string, number | null>;
  // unix seconds of das's last successful CoinGecko fetch.
  updatedAt: number | null;
}
