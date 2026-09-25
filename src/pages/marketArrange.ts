import type { Layout } from 'react-grid-layout';

// The Markets desk's own arrangement for whatever widths its widgets are
// set to. There are too many width combinations to lay out by hand (the
// Matrix 1-3 columns, History, Order book and Watchlist 1-2 each), so the
// desk searches them: the Matrix on top, then every order and every column
// for the other four, each dropped onto the lowest free spot under its
// columns. Every candidate is scored and the best wins. Only widths go
// in, never measured heights, so the arrangement stays put while data
// moves and only changes when a width setting does.

type Piece = {
  id: string;
  // Rows it is expected to take (8px desk rows): a content widget's usual
  // height, a fill widget's least.
  h: number;
  // A fill widget uses room it is stretched into; a content widget shows
  // it as blank card. Past `cap` a stretch is a hole all the same.
  fill: boolean;
  cap?: number;
};

// A content card stretches at most this many rows past its content (the
// desk's maxStretch for it); past that the room is a hole.
export const CONTENT_STRETCH = 12;

const TOP: Piece = { id: 'matrix', h: 28, fill: false };
const REST: Piece[] = [
  { id: 'rate', h: 25, fill: false },
  { id: 'chart', h: 36, fill: true, cap: 60 },
  { id: 'book', h: 53, fill: false },
  { id: 'watchlist', h: 30, fill: true },
];

// What a candidate costs, in row-columns: holes cost most, then blank
// space stretched into a content card, then a chart stretched thin, then
// the desk's height. A list soaks up room for (almost) nothing.
const HOLE = 3;
const BLANK = 1;
const THIN = 0.1;
const LIST = 0.02;
const HEIGHT = 0.3;

type Placed = { p: Piece; x: number; y: number; w: number };

const score = (placed: Placed[], cols: number): number => {
  const floor = placed.reduce((m, q) => Math.max(m, q.y + q.p.h), 0);
  let cost = floor * cols * HEIGHT;
  // Each column's covered rows, after every widget runs down to the next
  // one below it (or the floor), as far as it may.
  const covered = Array.from({ length: cols }, () => 0);
  for (const q of placed) {
    const next = placed
      .filter(
        (o) =>
          o !== q && o.y >= q.y + q.p.h && o.x < q.x + q.w && q.x < o.x + o.w,
      )
      .reduce((m, o) => Math.min(m, o.y), floor);
    const extra = next - (q.y + q.p.h);
    const usable = Math.min(
      extra,
      (q.p.cap ?? Infinity) - q.p.h,
      q.p.fill ? Infinity : CONTENT_STRETCH,
    );
    const stretch = Math.max(0, usable);
    if (q.p.fill) cost += stretch * q.w * (q.p.cap ? THIN : LIST);
    else cost += stretch * q.w * BLANK;
    for (let c = q.x; c < q.x + q.w; c += 1) covered[c] += q.p.h + stretch;
  }
  for (const c of covered) cost += Math.max(0, floor - c) * HOLE;
  return cost;
};

const permutations = <T>(xs: T[]): T[][] =>
  xs.length <= 1
    ? [xs]
    : xs.flatMap((x, i) =>
        permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [
          x,
          ...r,
        ]),
      );
const ORDERS = permutations(REST);

export const searchArrangement = (
  cols: number,
  span: (id: string) => number,
): Layout[] => {
  const width = (p: Piece) => Math.max(1, Math.min(cols, span(p.id)));
  let best: Placed[] = [];
  let bestCost = Infinity;
  const tw = width(TOP);
  for (let tx = 0; tx + tw <= cols; tx += 1)
    for (const order of ORDERS) {
      // Depth-first over each widget's column, lowest free spot under it.
      const walk = (i: number, placed: Placed[], sky: number[]) => {
        if (i === order.length) {
          const cost = score(placed, cols);
          if (cost < bestCost) [best, bestCost] = [placed, cost];
          return;
        }
        const p = order[i];
        const w = width(p);
        for (let x = 0; x + w <= cols; x += 1) {
          const y = Math.max(...sky.slice(x, x + w));
          const next = sky.slice();
          for (let c = x; c < x + w; c += 1) next[c] = y + p.h;
          walk(i + 1, [...placed, { p, x, y, w }], next);
        }
      };
      const sky = Array.from({ length: cols }, (_, c) =>
        c >= tx && c < tx + tw ? TOP.h : 0,
      );
      walk(0, [{ p: TOP, x: tx, y: 0, w: tw }], sky);
    }
  return best.map((q) => ({ i: q.p.id, x: q.x, y: q.y, w: q.w, h: q.p.h }));
};
