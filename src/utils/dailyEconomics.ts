export type FeeDay = {
  t: string;
  feesUsd?: number | string | null;
  unpricedSwaps?: number;
};
export type EmissionDay = { t: string; emissionsUsd: number | null };
/** Treasury income for one UTC day (epoch ms start), lamports; null = unknown. */
export type TreasuryDay = {
  t: number;
  reservationLamports: number | null;
  churnLamports: number | null;
  reservationEvents?: number | null;
  churnEvents?: number | null;
};
/** [epoch ms, USD per SOL]. */
export type PricePoint = [number, number];
export type EconomicsDay = {
  t: number;
  /** Total of every fee source below; null if any source is missing. */
  fees: number | null;
  swapFees: number | null;
  reservationFees: number | null;
  churnFees: number | null;
  emissions: number | null;
};
export const UTC_DAY_MS = 86_400_000;
const LAMPORTS_PER_SOL = 1e9;
const validAmount = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

/** Mean SOL/USD of the samples inside [t, t + 1 day], both ends inclusive:
 * the day's open and close for a complete day, open and latest for today. */
export function solUsdForDay(prices: PricePoint[], t: number): number | null {
  const inDay = prices
    .filter(([at, usd]) => at >= t && at <= t + UTC_DAY_MS && usd > 0)
    .map(([, usd]) => usd);
  return inDay.length
    ? inDay.reduce((sum, usd) => sum + usd, 0) / inDay.length
    : null;
}

const lamportsUsd = (lamports: number | null, solUsd: number | null) => {
  const amount = validAmount(lamports);
  return amount === null || solUsd === null
    ? null
    : (amount / LAMPORTS_PER_SOL) * solUsd;
};

/** Complete UTC days only. Missing/unpriced data stays a gap, never zero.
 * Without `treasury`, fees are swap fees alone. */
export function dailyEconomics(
  fees: FeeDay[],
  emissions: EmissionDay[],
  days: number,
  now = Date.now(),
  treasury?: TreasuryDay[],
  solUsd: PricePoint[] = [],
): EconomicsDay[] {
  const end = Math.floor(now / UTC_DAY_MS) * UTC_DAY_MS;
  const feeMap = new Map(fees.map((r) => [Date.parse(r.t), r]));
  const emissionMap = new Map(emissions.map((r) => [Date.parse(r.t), r]));
  const treasuryMap = new Map((treasury ?? []).map((r) => [r.t, r]));
  return Array.from({ length: days }, (_, i) => {
    const t = end - (days - i) * UTC_DAY_MS;
    const fee = feeMap.get(t);
    const emission = emissionMap.get(t);
    const swapFees =
      fee && fee.unpricedSwaps === 0 ? validAmount(fee.feesUsd) : null;
    const income = treasuryMap.get(t);
    const price = solUsdForDay(solUsd, t);
    const reservationFees = treasury
      ? lamportsUsd(income?.reservationLamports ?? null, price)
      : null;
    const churnFees = treasury
      ? lamportsUsd(income?.churnLamports ?? null, price)
      : null;
    const total = treasury
      ? swapFees === null || reservationFees === null || churnFees === null
        ? null
        : swapFees + reservationFees + churnFees
      : swapFees;
    return {
      t,
      fees: total,
      swapFees,
      reservationFees,
      churnFees,
      emissions: validAmount(emission?.emissionsUsd),
    };
  });
}

/** Completed days plus today's earned fees and elapsed-time emission estimate. */
export function economicsThroughNow(
  fees: FeeDay[],
  emissions: EmissionDay[],
  days: number,
  now = Date.now(),
  treasury?: TreasuryDay[],
  solUsd: PricePoint[] = [],
): EconomicsDay[] {
  const rows = dailyEconomics(fees, emissions, days, now, treasury, solUsd);
  const today = dailyEconomics(
    fees,
    emissions,
    1,
    now + UTC_DAY_MS,
    treasury,
    solUsd,
  )[0];
  const elapsed = (now - today.t) / UTC_DAY_MS;
  return [
    ...rows,
    {
      ...today,
      emissions: today.emissions === null ? null : today.emissions * elapsed,
    },
  ];
}

export function summarizeEconomics(rows: EconomicsDay[]) {
  const feesComplete = rows.length > 0 && rows.every((r) => r.fees !== null);
  const emissionsComplete =
    rows.length > 0 && rows.every((r) => r.emissions !== null);
  const fees = feesComplete ? rows.reduce((sum, r) => sum + r.fees!, 0) : null;
  const emissions = emissionsComplete
    ? rows.reduce((sum, r) => sum + r.emissions!, 0)
    : null;
  // Per-source totals follow the same rule: one gap suppresses the total.
  const total = (pick: (r: EconomicsDay) => number | null) =>
    rows.length > 0 && rows.every((r) => pick(r) !== null)
      ? rows.reduce((sum, r) => sum + pick(r)!, 0)
      : null;
  return {
    fees,
    swapFees: total((r) => r.swapFees),
    reservationFees: total((r) => r.reservationFees),
    churnFees: total((r) => r.churnFees),
    emissions,
    coverage:
      fees !== null && emissions !== null && emissions > 0
        ? (fees / emissions) * 100
        : null,
    surplus: fees !== null && emissions !== null ? fees - emissions : null,
    missingDays: rows.filter((r) => r.fees === null || r.emissions === null)
      .length,
  };
}
