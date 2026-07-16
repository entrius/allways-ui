import type { CrownHistoryRow } from '../../api';

export const TIER_PALETTE = [
  '#0052ff',
  '#4d7dff',
  '#7f9eff',
  '#aebeff',
  '#d2dafe',
];

// One grid cell spans this many seconds. Mirrors the old 1-block cadence
// (~12s) so the grid keeps the same cell density in the time-native model.
export const CELL_SECS = 12;

// Snap a unix-seconds timestamp down to its cell bucket.
export const cellBucket = (t: number): number =>
  Math.floor(t / CELL_SECS) * CELL_SECS;

export type CellState = {
  // Unix-seconds bucket timestamp for this cell.
  t: number;
  holderHotkey: string | null;
  holderUid: number | null;
  rate: number;
  isTie: boolean;
  isCurrent: boolean;
  color: string | null;
};

export type TierEntry = {
  hotkey: string;
  uid: number | null;
  count: number;
  color: string;
};

// Build per-cell rows for the [lo, hi] window (unix seconds, stepped by
// CELL_SECS). When `subjectUid` is set, every cell shows whether *that* uid held
// the crown (subjectColor or null), not the actual winner — used on the
// per-miner page where the page locks to its own uid. Otherwise the top
// alphabetical holder wins and gets tier color.
export const buildCells = (
  rows: CrownHistoryRow[],
  lo: number,
  hi: number,
  headT: number,
  tiers: Map<string, string>,
  otherColor: string,
  subjectUid: number | null = null,
  subjectColor: string | null = null,
): CellState[] => {
  // Expand each interval across every cell it spans — rows are [t, endedAt) holds,
  // not point events; bucketing the start alone painted one cell per hold.
  const byBucket = new Map<number, CrownHistoryRow[]>();
  for (const row of rows) {
    const end = Math.min(row.endedAt || row.t + CELL_SECS, hi + CELL_SECS);
    for (
      let b = Math.max(cellBucket(row.t), cellBucket(lo));
      b < end;
      b += CELL_SECS
    ) {
      const arr = byBucket.get(b) ?? [];
      arr.push(row);
      byBucket.set(b, arr);
    }
  }
  const headBucket = cellBucket(headT);
  const cells: CellState[] = [];
  for (let b = cellBucket(lo); b <= hi; b += CELL_SECS) {
    const here = byBucket.get(b) ?? [];
    here.sort((a, c) => a.hotkey.localeCompare(c.hotkey));
    if (subjectUid != null) {
      const mine = here.find((r) => r.uid === subjectUid);
      cells.push({
        t: b,
        holderHotkey: mine?.hotkey ?? null,
        holderUid: mine?.uid ?? null,
        rate: mine?.rate ?? 0,
        isTie: mine != null && here.length > 1,
        isCurrent: b === headBucket,
        color: mine ? subjectColor : null,
      });
      continue;
    }
    const winner = here[0];
    cells.push({
      t: b,
      holderHotkey: winner?.hotkey ?? null,
      holderUid: winner?.uid ?? null,
      rate: winner?.rate ?? 0,
      isTie: here.length > 1,
      isCurrent: b === headBucket,
      color: winner?.hotkey ? (tiers.get(winner.hotkey) ?? otherColor) : null,
    });
  }
  return cells;
};

// Tier coloring is stable per (hotkey, window) — most-crown-cells wins the
// top color, ties broken by sort order. The legend renders `ordered`; the
// cells look up `color`.
export const buildTiers = (
  rows: CrownHistoryRow[],
  lo: number,
  hi: number,
): { color: Map<string, string>; ordered: TierEntry[] } => {
  const counts = new Map<string, { uid: number | null; count: number }>();
  for (const row of rows) {
    const end = Math.min(row.endedAt || row.t + CELL_SECS, hi);
    if (end < lo || row.t > hi) continue;
    // Weight by held cells within the window, not interval count — a 37-minute
    // hold outranks three 10-second ones.
    const held = Math.max(
      1,
      Math.floor((end - Math.max(row.t, lo)) / CELL_SECS),
    );
    const entry = counts.get(row.hotkey);
    if (entry) entry.count += held;
    else counts.set(row.hotkey, { uid: row.uid ?? null, count: held });
  }
  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([hotkey, { uid, count }], idx) => ({
      hotkey,
      uid,
      count,
      color: TIER_PALETTE[idx] ?? '#6b7280',
    }));
  const colorMap = new Map<string, string>();
  for (const { hotkey, color } of sorted) colorMap.set(hotkey, color);
  return { color: colorMap, ordered: sorted };
};
