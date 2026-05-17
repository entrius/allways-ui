import type { CrownHistoryRow } from '../../api';

export const TIER_PALETTE = [
  '#0052ff',
  '#4d7dff',
  '#7f9eff',
  '#aebeff',
  '#d2dafe',
];

export type CellState = {
  block: number;
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

// Build per-block cell rows for [lo, hi]. When `subjectUid` is set, every
// cell shows whether *that* uid held the crown (subjectColor or null), not
// the actual winner — used on the per-miner page where the page locks to
// its own uid. Otherwise the top alphabetical holder wins and gets tier
// color.
export const buildCells = (
  rows: CrownHistoryRow[],
  lo: number,
  hi: number,
  maxBlock: number,
  tiers: Map<string, string>,
  otherColor: string,
  subjectUid: number | null = null,
  subjectColor: string | null = null,
): CellState[] => {
  const byBlock = new Map<number, CrownHistoryRow[]>();
  for (const row of rows) {
    const arr = byBlock.get(row.block) ?? [];
    arr.push(row);
    byBlock.set(row.block, arr);
  }
  const cells: CellState[] = [];
  for (let b = lo; b <= hi; b++) {
    const here = byBlock.get(b) ?? [];
    here.sort((a, c) => a.hotkey.localeCompare(c.hotkey));
    if (subjectUid != null) {
      const mine = here.find((r) => r.uid === subjectUid);
      cells.push({
        block: b,
        holderHotkey: mine?.hotkey ?? null,
        holderUid: mine?.uid ?? null,
        rate: mine?.rate ?? 0,
        isTie: mine != null && here.length > 1,
        isCurrent: b === maxBlock,
        color: mine ? subjectColor : null,
      });
      continue;
    }
    const winner = here[0];
    cells.push({
      block: b,
      holderHotkey: winner?.hotkey ?? null,
      holderUid: winner?.uid ?? null,
      rate: winner?.rate ?? 0,
      isTie: here.length > 1,
      isCurrent: b === maxBlock,
      color: winner?.hotkey ? (tiers.get(winner.hotkey) ?? otherColor) : null,
    });
  }
  return cells;
};

// Tier coloring is stable per (hotkey, window) — most-crown-blocks wins the
// top color, ties broken by sort order. The legend renders `ordered`; the
// cells look up `color`.
export const buildTiers = (
  rows: CrownHistoryRow[],
  lo: number,
  hi: number,
): { color: Map<string, string>; ordered: TierEntry[] } => {
  const counts = new Map<string, { uid: number | null; count: number }>();
  for (const row of rows) {
    if (row.block < lo || row.block > hi) continue;
    const entry = counts.get(row.hotkey);
    if (entry) entry.count += 1;
    else counts.set(row.hotkey, { uid: row.uid ?? null, count: 1 });
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
