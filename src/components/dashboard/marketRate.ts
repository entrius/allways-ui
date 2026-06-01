import type { ActiveSwap } from '../../api/models';
import type { Direction } from '../../api/models/MinersDashboard';

// How many of the most recent completed swaps feed the chart, and the EMA
// smoothing window over that series. Shared by the chart and the ticker.
export const WINDOW = 100;
export const EMA_PERIOD = 10;

export type RatePoint = { block: number; rate: number; vol: number };

const matchesDirection = (s: ActiveSwap, dir: Direction): boolean => {
  const src = s.sourceChain?.toLowerCase();
  const dst = s.destChain?.toLowerCase();
  if (dir === 'BTC-TAO') return src === 'btc' && dst === 'tao';
  return src === 'tao' && dst === 'btc';
};

// Completed swaps for a direction as {block, rate, vol} points, oldest→newest,
// capped at the most recent WINDOW.
export const completedPoints = (
  swaps: ActiveSwap[] | undefined,
  dir: Direction,
): RatePoint[] => {
  if (!swaps) return [];
  return swaps
    .filter(
      (s) =>
        s.status === 'COMPLETED' &&
        s.rate != null &&
        s.completedBlock != null &&
        matchesDirection(s, dir),
    )
    .map((s) => {
      const vol = s.taoAmount ? parseFloat(s.taoAmount) : 0;
      return {
        block: parseInt(s.completedBlock as string, 10),
        rate: parseFloat(s.rate as string),
        vol: Number.isFinite(vol) ? vol : 0,
      };
    })
    .filter(
      (p) => Number.isFinite(p.block) && Number.isFinite(p.rate) && p.rate > 0,
    )
    .sort((a, b) => a.block - b.block)
    .slice(-WINDOW);
};

// Drop rate outliers beyond Tukey fences (1.5·IQR) so a few stale/anomalous
// rates don't dominate; report how many were removed.
export const tukeyClean = (
  pts: RatePoint[],
): { clean: RatePoint[]; hidden: number } => {
  if (pts.length < 4) return { clean: pts, hidden: 0 };
  const s = pts.map((p) => p.rate).sort((a, b) => a - b);
  const q = (p: number) => s[Math.floor((s.length - 1) * p)];
  const q1 = q(0.25);
  const q3 = q(0.75);
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const clean = pts.filter((p) => p.rate >= lo && p.rate <= hi);
  return clean.length
    ? { clean, hidden: pts.length - clean.length }
    : { clean: pts, hidden: 0 };
};

// Standard exponential moving average; index-aligned with the input series.
export const ema = (values: number[], period: number): number[] => {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  values.forEach((v, i) => {
    prev = i === 0 ? v : v * k + prev * (1 - k);
    out.push(prev);
  });
  return out;
};

// Total TAO volume per exact block so each bar sits under its swap point(s).
export const volumeByBlock = (
  pts: RatePoint[],
): { block: number; vol: number }[] => {
  const m = new Map<number, number>();
  for (const p of pts) m.set(p.block, (m.get(p.block) ?? 0) + p.vol);
  return [...m.entries()]
    .map(([block, vol]) => ({ block, vol }))
    .sort((a, b) => a.block - b.block);
};

// Padded y-axis bounds for the (already outlier-free) scatter series.
//
// `soft` values (the EMA line) widen the padded core band so the line keeps a
// little breathing room from the frame. `hard` values (the live crown rate)
// must stay on-axis but get NO padding beyond them: when the crown is far from
// recent fills it sits flush at the very top/bottom edge rather than pushing a
// wasteful empty margin past the reference line. Both guarantee visibility —
// without this the crown line and EMA dips can clip off-chart.
export const robustYRange = (
  values: number[],
  { soft = [], hard = [] }: { soft?: number[]; hard?: number[] } = {},
): { min: number; max: number } | null => {
  const softVals = soft.filter((v) => Number.isFinite(v));
  const hardVals = hard.filter((v) => Number.isFinite(v));

  // Core band from the scatter values (robust to outliers), widened by the
  // soft must-show set (EMA), which can dip just outside the executed band.
  let coreMin: number | undefined;
  let coreMax: number | undefined;
  if (values.length >= 4) {
    const s = [...values].sort((a, b) => a - b);
    const q = (p: number) => s[Math.floor((s.length - 1) * p)];
    const q1 = q(0.25);
    const q3 = q(0.75);
    const iqr = q3 - q1;
    const lo = q1 - 1.5 * iqr;
    const hi = q3 + 1.5 * iqr;
    const inBand = s.filter((v) => v >= lo && v <= hi);
    if (inBand.length) {
      coreMin = inBand[0];
      coreMax = inBand[inBand.length - 1];
    }
  }
  for (const v of softVals) {
    coreMin = coreMin === undefined ? v : Math.min(coreMin, v);
    coreMax = coreMax === undefined ? v : Math.max(coreMax, v);
  }
  // No core series to anchor on — fall back to whatever we must hard-show.
  if (coreMin === undefined || coreMax === undefined) {
    if (!hardVals.length) return null;
    coreMin = Math.min(...hardVals);
    coreMax = Math.max(...hardVals);
  }

  if (coreMin === coreMax) {
    coreMin -= 1;
    coreMax += 1;
  }
  const pad = (coreMax - coreMin) * 0.12 || 1;
  let min = coreMin - pad;
  let max = coreMax + pad;

  // Clamp the axis to any hard value beyond the padded core — flush, no extra
  // margin past it.
  for (const v of hardVals) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
};

// Latest EMA rate for a direction — the smoothed recent-market rate the ticker
// shows next to the live crown rate.
export const latestEmaRate = (
  swaps: ActiveSwap[] | undefined,
  dir: Direction,
): number | null => {
  const { clean } = tukeyClean(completedPoints(swaps, dir));
  if (!clean.length) return null;
  const e = ema(
    clean.map((p) => p.rate),
    EMA_PERIOD,
  );
  return e[e.length - 1] ?? null;
};
