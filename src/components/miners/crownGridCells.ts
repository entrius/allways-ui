import { alpha } from '@mui/material/styles';
import type { CrownHistoryRow } from '../../api';

// Monochrome tier ramp derived from the theme's primary text shade, matching
// the Network Stats / Crown Rate convention: data encodings carry no fixed
// accent color, rank is opacity. Steps stay above the grid's ~0.2-alpha
// "other" cells so the top five holders remain distinguishable.
export const tierPalette = (fg: string): string[] => [
  alpha(fg, 1),
  alpha(fg, 0.78),
  alpha(fg, 0.6),
  alpha(fg, 0.44),
  alpha(fg, 0.3),
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
  // More than one holder shares this cell (a rate band or a dead-heat).
  isTie: boolean;
  isCurrent: boolean;
  color: string | null;
  // Every holder overlapping this cell, dominant (highest credit) first —
  // feeds the hover card's per-member share list.
  holders: CrownHistoryRow[];
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
// per-miner page where the page locks to its own uid. Otherwise the dominant
// (highest-credit) holder wins the cell and gets tier color.
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
    const bucketRows = byBucket.get(b) ?? [];
    // Dominant first: highest credit wins the cell, hotkey as a deterministic
    // tie-break (also the whole sort for pre-credit APIs, matching old order).
    bucketRows.sort(
      (a, c) =>
        (c.credit ?? 1) - (a.credit ?? 1) || a.hotkey.localeCompare(c.hotkey),
    );
    // A cell spanning an interval boundary holds rows from both intervals, so
    // the same hotkey can appear twice with different credits. Keep only its
    // best row: duplicates would inflate the hover list past 100% and flag a
    // one-miner cell as tied.
    const seen = new Set<string>();
    const here: CrownHistoryRow[] = [];
    for (const row of bucketRows) {
      if (!seen.has(row.hotkey)) {
        seen.add(row.hotkey);
        here.push(row);
      }
    }
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
        holders: here,
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
      holders: here,
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
  palette: string[],
  overflowColor: string,
): { color: Map<string, string>; ordered: TierEntry[] } => {
  const counts = new Map<string, { uid: number | null; count: number }>();
  for (const row of rows) {
    const end = Math.min(row.endedAt || row.t + CELL_SECS, hi);
    if (end < lo || row.t > hi) continue;
    // Weight by held cells within the window, not interval count — a 37-minute
    // hold outranks three 10-second ones. Scale by credit so a band's sliver
    // members don't rank alongside its dominant holder.
    const held =
      Math.max(1, Math.floor((end - Math.max(row.t, lo)) / CELL_SECS)) *
      (row.credit ?? 1);
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
      color: palette[idx] ?? overflowColor,
    }));
  const colorMap = new Map<string, string>();
  for (const { hotkey, color } of sorted) colorMap.set(hotkey, color);
  return { color: colorMap, ordered: sorted };
};
