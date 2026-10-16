export type FeeDay = {
  t: string;
  feesUsd?: number | string | null;
  unpricedSwaps?: number;
};
/** Miner emissions after burn, plus what MinerBurned withheld (USD/day). */
export type EmissionDay = {
  t: string;
  emissionsUsd: number | null;
  burnedUsd?: number | null;
  /** The subnet owner's cut and the validators' half, same day, USD. */
  ownerUsd?: number | null;
  validatorUsd?: number | null;
};
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
  /** Miner emissions after burn. */
  emissions: number | null;
  /** Miner emissions withheld by MinerBurned; null when not reported. */
  burned: number | null;
  owner: number | null;
  validators: number | null;
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
      burned: validAmount(emission?.burnedUsd),
      owner: validAmount(emission?.ownerUsd),
      validators: validAmount(emission?.validatorUsd),
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
  // Until the collector samples today, carry the latest sampled day's rate
  // forward: today's figure is an elapsed-time estimate either way.
  const latest = [...emissions]
    .filter(
      (r) => Date.parse(r.t) < today.t && validAmount(r.emissionsUsd) !== null,
    )
    .sort((a, b) => Date.parse(b.t) - Date.parse(a.t))[0];
  const rate = today.emissions === null ? latest : null;
  const dayEmissions = rate ? validAmount(rate.emissionsUsd) : today.emissions;
  const dayBurned = rate ? validAmount(rate.burnedUsd) : today.burned;
  const dayOwner = rate ? validAmount(rate.ownerUsd) : today.owner;
  const dayValidators = rate
    ? validAmount(rate.validatorUsd)
    : today.validators;
  const sofar = (v: number | null) => (v === null ? null : v * elapsed);
  return [
    ...rows,
    {
      ...today,
      emissions: sofar(dayEmissions),
      burned: sofar(dayBurned),
      owner: sofar(dayOwner),
      validators: sofar(dayValidators),
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
  const burned = total((r) => r.burned);
  const owner = total((r) => r.owner);
  const validators = total((r) => r.validators);
  // Everything the subnet actually emitted: owner + validators + miners paid.
  // The burned miner share was never emitted, so it is not counted.
  const totalEmissions =
    emissions === null || owner === null || validators === null
      ? null
      : emissions + owner + validators;
  const comparable = rows.filter(
    (r) => r.fees !== null && r.emissions !== null && r.emissions > 0,
  );
  return {
    fees,
    burned,
    owner,
    validators,
    totalEmissions,
    /** Fees against everything emitted, not just the miners' share. */
    totalCoverage:
      fees !== null && totalEmissions !== null && totalEmissions > 0
        ? (fees / totalEmissions) * 100
        : null,
    /** Share of pre-burn miner emissions that MinerBurned withheld. */
    burnRate:
      burned !== null && emissions !== null && emissions + burned > 0
        ? (burned / (emissions + burned)) * 100
        : null,
    /** Days whose fees matched or beat that day's miner emissions. */
    coveredDays: comparable.filter((r) => r.fees! >= r.emissions!).length,
    comparableDays: comparable.length,
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

/**
 * Whole weeks of complete days, newest last, each stamped with its first
 * day: spiky daily data reads as a trend once it is weekly. Today (the last,
 * partial row) and any leftover days before the oldest full week are left
 * out; a week with a gap in a field carries null for that field.
 */
export function weeklyEconomics(rows: EconomicsDay[]): EconomicsDay[] {
  const complete = rows.slice(0, -1);
  const weeks: EconomicsDay[] = [];
  for (let end = complete.length; end - 7 >= 0; end -= 7) {
    const days = complete.slice(end - 7, end);
    const total = (pick: (r: EconomicsDay) => number | null) =>
      days.every((r) => pick(r) !== null)
        ? days.reduce((sum, r) => sum + pick(r)!, 0)
        : null;
    weeks.unshift({
      t: days[0].t,
      fees: total((r) => r.fees),
      swapFees: total((r) => r.swapFees),
      reservationFees: total((r) => r.reservationFees),
      churnFees: total((r) => r.churnFees),
      emissions: total((r) => r.emissions),
      burned: total((r) => r.burned),
      owner: total((r) => r.owner),
      validators: total((r) => r.validators),
    });
  }
  return weeks;
}

/** Running totals day by day; a field goes null from its first gap on, so a
 * missing day never reads as a flat stretch. */
export function cumulativeEconomics(rows: EconomicsDay[]): EconomicsDay[] {
  const keys = [
    'fees',
    'swapFees',
    'reservationFees',
    'churnFees',
    'emissions',
    'burned',
    'owner',
    'validators',
  ] as const;
  const run: Record<(typeof keys)[number], number | null> = {
    fees: 0,
    swapFees: 0,
    reservationFees: 0,
    churnFees: 0,
    emissions: 0,
    burned: 0,
    owner: 0,
    validators: 0,
  };
  return rows.map((r) => {
    const out = { ...r };
    for (const k of keys) {
      const v = r[k];
      run[k] = run[k] === null || v === null ? null : run[k]! + v;
      out[k] = run[k];
    }
    return out;
  });
}
