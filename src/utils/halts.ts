import type { ContractEvent } from '../api/models';

/** One stretch the contract was halted: epoch ms, `to` null while ongoing. */
export type HaltPeriod = { from: number; to: number | null };

const isHalted = (v: unknown) => v === true || v === 'true' || v === 1;

/**
 * Pair the contract's HaltSet events into halted stretches, oldest first.
 * A repeated halt (halted → halted) extends the open stretch rather than
 * starting a new one; an unhalt with nothing open is ignored.
 */
export const haltPeriods = (events: ContractEvent[]): HaltPeriod[] => {
  const ordered = events
    .filter((e) => e.blockTime != null)
    .sort((a, b) => Number(a.slot) - Number(b.slot));
  const out: HaltPeriod[] = [];
  let open: number | null = null;
  for (const e of ordered) {
    const t = Number(e.blockTime) * 1000;
    if (isHalted(e.eventData?.halted)) {
      if (open == null) open = t;
    } else if (open != null) {
      out.push({ from: open, to: t });
      open = null;
    }
  }
  if (open != null) out.push({ from: open, to: null });
  return out;
};

/** How much of [from, to) the network spent halted, in ms. */
export const haltedMs = (
  halts: HaltPeriod[],
  from: number,
  to: number,
  now = Date.now(),
) =>
  halts.reduce((sum, h) => {
    const a = Math.max(h.from, from);
    const b = Math.min(h.to ?? now, to);
    return b > a ? sum + (b - a) : sum;
  }, 0);

/** "40m", "3h 26m", "2d 5h": a halt's length at a glance. */
export const formatHaltDuration = (ms: number) => {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
};
