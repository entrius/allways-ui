export type FeeDay = {
  t: string;
  feesUsd?: number | string | null;
  unpricedSwaps?: number;
};
export type EmissionDay = { t: string; emissionsUsd: number | null };
export type EconomicsDay = {
  t: number;
  fees: number | null;
  emissions: number | null;
};
export const UTC_DAY_MS = 86_400_000;
const validAmount = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

/** Complete UTC days only. Missing/unpriced data stays a gap, never zero. */
export function dailyEconomics(
  fees: FeeDay[],
  emissions: EmissionDay[],
  days: number,
  now = Date.now(),
): EconomicsDay[] {
  const end = Math.floor(now / UTC_DAY_MS) * UTC_DAY_MS;
  const feeMap = new Map(fees.map((r) => [Date.parse(r.t), r]));
  const emissionMap = new Map(emissions.map((r) => [Date.parse(r.t), r]));
  return Array.from({ length: days }, (_, i) => {
    const t = end - (days - i) * UTC_DAY_MS;
    const fee = feeMap.get(t);
    const emission = emissionMap.get(t);
    return {
      t,
      fees: fee && fee.unpricedSwaps === 0 ? validAmount(fee.feesUsd) : null,
      emissions: validAmount(emission?.emissionsUsd),
    };
  });
}

export function summarizeEconomics(rows: EconomicsDay[]) {
  const feesComplete = rows.length > 0 && rows.every((r) => r.fees !== null);
  const emissionsComplete =
    rows.length > 0 && rows.every((r) => r.emissions !== null);
  const fees = feesComplete ? rows.reduce((sum, r) => sum + r.fees!, 0) : null;
  const emissions = emissionsComplete
    ? rows.reduce((sum, r) => sum + r.emissions!, 0)
    : null;
  return {
    fees,
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
