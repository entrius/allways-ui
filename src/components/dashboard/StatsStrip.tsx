import React, { useMemo } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { useCompleteSwapHistory, useUsdPrices } from '../../api';
import {
  decomposeDirection,
  directionLabel,
  type Direction,
} from '../../api/models/MinersDashboard';
import {
  canonicalSource,
  chainSymbol,
  formatUsd,
  usdFromHuman,
} from '../../utils/format';
import { hubLegVolume } from './marketRate';
import { FONTS } from '../../theme';

const Item: React.FC<{
  label: string;
  value: React.ReactNode;
  hint: string;
  /** Full-width row, label left and value right, for a key-stats list. */
  row?: boolean;
}> = ({ label, value, hint, row }) => (
  <Tooltip title={hint} arrow placement="top">
    <Stack
      direction="row"
      alignItems="baseline"
      spacing={0.75}
      sx={
        row
          ? { justifyContent: 'space-between', width: '100%', py: 0.35 }
          : undefined
      }
    >
      <Typography
        sx={{
          fontFamily: row ? undefined : FONTS.mono,
          fontSize: row ? '0.72rem' : '0.6rem',
          letterSpacing: row ? undefined : '0.08em',
          textTransform: row ? 'none' : 'uppercase',
          color: 'text.secondary',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: row ? '0.74rem' : '0.78rem',
          fontWeight: 600,
          color: 'text.primary',
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
    </Stack>
  </Tooltip>
);

export type StatKey = 'vol' | 'txns' | 'success' | 'inFlight';
const ALL_STATS: StatKey[] = ['vol', 'txns', 'success', 'inFlight'];

// Symbol stats for a market — one or more directions pooled — over the
// hero's selected window, computed from the raw swap history so any window
// works (the /history endpoint only serves fixed network-wide buckets).
// In-flight is a current level, not windowed.
const StatsStrip: React.FC<{
  directions: Direction[];
  /** Window length in seconds (the hero range). */
  secs: number;
  /** Chip text for labels, e.g. "1D". */
  rangeLabel: string;
  /** No frame — for embedding inside the market hero. */
  bare?: boolean;
  /** One stat per line, label left and value right — the key-stats list
   * shape. The wrapping row is for wide surfaces; in a narrow rail it leaves
   * a ragged orphan on its own line. */
  rows?: boolean;
  /** Which stats to render, in this order. Defaults to all four. */
  stats?: StatKey[];
  /** Drop the window prefix from each label. For callers whose own heading
   * already states the range, so it isn't repeated on every stat. */
  hideRange?: boolean;
}> = ({
  directions,
  secs,
  rangeLabel,
  bare,
  rows,
  hideRange,
  stats: show = ALL_STATS,
}) => {
  const { data: swaps } = useCompleteSwapHistory();
  const legs = useMemo(() => directions.map(decomposeDirection), [directions]);
  // Every direction here shares one pair, so its hub leg is the strip's one
  // volume denomination — never a sum across backings.
  const hub = canonicalSource(legs[0].from, legs[0].to);

  const stats = useMemo(() => {
    const cutoff = Date.now() / 1000 - secs;
    let volume = 0;
    let completed = 0;
    let timedOut = 0;
    let inFlight = 0;
    for (const s of swaps ?? []) {
      const src = s.sourceChain?.toLowerCase();
      const dst = s.destChain?.toLowerCase();
      if (!legs.some((l) => l.from === src && l.to === dst)) continue;
      if (s.status === 'ACTIVE' || s.status === 'FULFILLED') inFlight += 1;
      if (s.initiatedAt == null || Number(s.initiatedAt) < cutoff) continue;
      if (s.status === 'COMPLETED') {
        completed += 1;
        const v = hubLegVolume(s, hub);
        if (Number.isFinite(v)) volume += v;
      } else if (s.status === 'TIMED_OUT') {
        timedOut += 1;
      }
    }
    return {
      volume,
      completed,
      inFlight,
      success:
        completed + timedOut > 0 ? completed / (completed + timedOut) : null,
    };
  }, [swaps, legs, hub, secs]);

  const fmtVol = (v: number) =>
    v >= 1000
      ? `${(v / 1000).toFixed(1)}k`
      : v.toLocaleString(undefined, { maximumFractionDigits: 2 });

  // Estimated USD readout when the hub has a price; native hub units
  // otherwise (older das / prices not fetched yet).
  const prices = useUsdPrices();
  const volUsd = usdFromHuman(stats.volume, hub, prices);

  // Hint wording: a single leg keeps its arrow label; a pooled market reads
  // as the two-way pair.
  const dir =
    directions.length === 1
      ? directionLabel(directions[0])
      : `${legs[0].from.toUpperCase()} ⇄ ${legs[0].to.toUpperCase()}`;

  // Label prefix, e.g. "1D vol" vs plain "vol".
  const p = hideRange ? '' : `${rangeLabel} `;

  return (
    <Box
      sx={{
        ...(rows
          ? { display: 'flex', flexDirection: 'column' }
          : {
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              columnGap: 3,
              rowGap: 0.5,
            }),
        ...(bare
          ? {}
          : {
              py: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
            }),
      }}
    >
      {show.map((key) =>
        key === 'vol' ? (
          <Item
            key={key}
            row={rows}
            label={`${p}vol`}
            value={
              volUsd != null
                ? formatUsd(volUsd)
                : `${fmtVol(stats.volume)} ${chainSymbol(hub)}`
            }
            hint={
              volUsd != null
                ? `${dir} volume completed over the selected window: ${fmtVol(stats.volume)} ${chainSymbol(hub)}, estimated in USD at current prices.`
                : `${dir} volume (${chainSymbol(hub)} side) completed over the selected window.`
            }
          />
        ) : key === 'txns' ? (
          <Item
            key={key}
            row={rows}
            label={`${p}txns`}
            value={stats.completed.toLocaleString()}
            hint={`${dir} swaps completed over the selected window.`}
          />
        ) : key === 'success' ? (
          <Item
            key={key}
            row={rows}
            label={`${p}success`}
            value={
              stats.success != null
                ? `${(stats.success * 100).toFixed(1)}%`
                : '—'
            }
            hint={`Share of ${dir} swaps that completed (vs timed out) over the selected window.`}
          />
        ) : (
          <Item
            key={key}
            row={rows}
            label="in flight"
            value={String(stats.inFlight)}
            hint={`${dir} transactions currently in progress.`}
          />
        ),
      )}
    </Box>
  );
};

export default StatsStrip;
