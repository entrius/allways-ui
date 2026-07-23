import React, { useMemo } from 'react';
import { Box, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import {
  useCompleteSwapHistory,
  useCrownRateHistory,
  useCurrentCrown,
} from '../../api';
import {
  decomposeDirection,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { useSpokes } from '../../hooks';
import { formatRate, lamportsToSol } from '../../utils/format';
import { FONTS } from '../../theme';
import { ChainLogo } from '../ChainLogo';
import StatsStrip from './StatsStrip';
import { MOVE_COLORS, type HeroRange, RANGE_SECS } from './AllwaysMarketRate';

// Compact volume readout: "55.4", "1.2k".
const fmtVol = (v: number) =>
  v >= 1000
    ? `${(v / 1000).toFixed(1)}k`
    : v.toLocaleString(undefined, { maximumFractionDigits: 1 });

const railLabelSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.6rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'text.secondary',
} as const;

// FX-style instrument label, "SOL-BTC" with the two chain logos slightly
// overlapped like a forex flag pair — this IS a currency market, just with
// "currency" abstracted to any blockchain. Base-quote reads the same as our
// route: the rate is quote units per 1 base.
const RouteLabel: React.FC<{ direction: Direction; logoSize?: number }> = ({
  direction,
  logoSize = 14,
}) => {
  const { from, to } = decomposeDirection(direction);
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
      }}
    >
      <Box
        component="span"
        sx={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {/* Quote logo tucked behind-right of the base logo, forex flag-pair
            style (negative z-index would drop it behind the row background,
            so the base logo is lifted instead). */}
        <Box
          component="span"
          sx={{ display: 'inline-flex', position: 'relative', zIndex: 1 }}
        >
          <ChainLogo chain={from} size={logoSize} />
        </Box>
        <Box component="span" sx={{ display: 'inline-flex', ml: -0.5 }}>
          <ChainLogo chain={to} size={logoSize} />
        </Box>
      </Box>
      {/* Slash, not hyphen: EUR/USD is the canonical FX display notation
          (quote per 1 base); hyphens stay in machine land (Direction ids,
          ?dir= URLs). */}
      <Box component="span">
        {from.toUpperCase()}
        <Box component="span" sx={{ color: 'text.disabled' }}>
          /
        </Box>
        {to.toUpperCase()}
      </Box>
    </Box>
  );
};

// One watchlist row — tradingview shape: symbol · last · windowed change.
// Every
// DIRECTION is its own instrument, quoted in its natural unit ("1 SOL →
// 0.00097 BTC"), so the row is just that route's crown and its move.
const DirectionRow: React.FC<{
  direction: Direction;
  selected: boolean;
  /** Window length in seconds (the page's range toggle). */
  secs: number;
  onSelect: (direction: Direction) => void;
}> = ({ direction, selected, secs, onSelect }) => {
  const theme = useTheme();

  const { data: crown } = useCurrentCrown();
  const live = directionalRateFor(direction, crown?.[direction]?.rate);
  const { data: rows } = useCrownRateHistory({
    direction,
    secs,
  });

  // 1D volume (SOL side) of this route's completed swaps — one shared
  // swap-history query across all rows, filtered per direction.
  const { from, to } = decomposeDirection(direction);
  const { data: swaps } = useCompleteSwapHistory();
  const vol = useMemo(() => {
    const cutoff = Date.now() / 1000 - secs;
    let sum = 0;
    for (const s of swaps ?? []) {
      if (
        s.status !== 'COMPLETED' ||
        s.initiatedAt == null ||
        Number(s.initiatedAt) < cutoff ||
        s.sourceChain?.toLowerCase() !== from ||
        s.destChain?.toLowerCase() !== to
      )
        continue;
      const v = s.solAmount != null ? lamportsToSol(s.solAmount) : NaN;
      if (Number.isFinite(v)) sum += v;
    }
    return sum;
  }, [swaps, from, to, secs]);
  const first = rows?.length
    ? directionalRateFor(direction, rows[0].rate)
    : null;
  const last =
    live ??
    (rows?.length
      ? directionalRateFor(direction, rows[rows.length - 1].rate)
      : null);
  const chg =
    first != null && first !== 0 && last != null
      ? ((last - first) / first) * 100
      : null;

  const move = MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  const chgColor =
    chg == null || chg === 0
      ? theme.palette.text.secondary
      : chg > 0
        ? move.up
        : move.down;

  return (
    <Box
      component="button"
      onClick={() => onSelect(direction)}
      sx={{
        all: 'unset',
        // `all: unset` drops the block width too — re-stretch so the row's
        // columns line up with the header row above the list.
        width: '100%',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        alignItems: 'center',
        columnGap: 1,
        px: 1,
        py: 0.9,
        borderLeft: '2px solid',
        borderLeftColor: selected ? 'text.primary' : 'transparent',
        backgroundColor: selected ? 'action.hover' : 'transparent',
        '&:hover': { backgroundColor: 'action.hover' },
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          fontFamily: FONTS.mono,
          fontSize: '0.72rem',
          fontWeight: 600,
          color: 'text.primary',
          minWidth: 0,
        }}
      >
        <RouteLabel direction={direction} />
      </Box>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.72rem',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 64,
          textAlign: 'right',
        }}
      >
        {last != null ? formatRate(last) : '—'}
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.66rem',
          fontWeight: 500,
          color: 'text.secondary',
          fontVariantNumeric: 'tabular-nums',
          minWidth: 44,
          textAlign: 'right',
        }}
      >
        {fmtVol(vol)}
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.66rem',
          fontWeight: 600,
          color: chgColor,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 52,
          textAlign: 'right',
        }}
      >
        {chg != null ? `${chg > 0 ? '+' : ''}${chg.toFixed(2)}%` : ''}
      </Typography>
    </Box>
  );
};

// tradingview-style right rail for the market page: the markets watchlist on
// top — one row per DIRECTION, click to switch the whole page's instrument —
// and the selected route's detail card (its rate, the reverse route's rate,
// the pair spread, and 1D key stats) pinned beneath.
const PairsRail: React.FC<{
  direction: Direction;
  onDirectionChange: (direction: Direction) => void;
  /** Selected window (the chart's range toggle) — vol, chg%, and key stats
   * all follow it, so 1W on the chart means 1W everywhere on the rail. */
  range: HeroRange;
}> = ({ direction, onDirectionChange, range }) => {
  const secs = RANGE_SECS[range];
  const { from, to, spoke } = decomposeDirection(direction);
  const spokes = useSpokes(spoke);
  const directions = useMemo<Direction[]>(
    () =>
      spokes.flatMap((s) => {
        const S = s.toUpperCase();
        return [`SOL-${S}`, `${S}-SOL`] as Direction[];
      }),
    [spokes],
  );
  const reverseDir = `${to.toUpperCase()}-${from.toUpperCase()}` as Direction;

  const { data: crown } = useCurrentCrown();
  const selRate = directionalRateFor(direction, crown?.[direction]?.rate);
  const revRate = directionalRateFor(reverseDir, crown?.[reverseDir]?.rate);
  // Both routes' rates in one numeraire (to per 1 from) — the selected
  // route as-is vs the reverse route inverted.
  const revImplied = revRate ? 1 / revRate : null;
  // SIGNED spread: percent difference of this route's rate vs the reverse
  // route's. The sign carries meaning — it equals the round-trip gain
  // (positive: out-and-back at these crowns comes out ahead; negative:
  // it costs you this much).
  const spreadPct =
    selRate != null && revImplied != null && revImplied !== 0
      ? ((selRate - revImplied) / revImplied) * 100
      : null;
  const theme = useTheme();
  const move = MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  const spreadColor =
    spreadPct == null || spreadPct === 0
      ? theme.palette.text.secondary
      : spreadPct > 0
        ? move.up
        : move.down;

  return (
    <Stack sx={{ height: '100%', minHeight: 0, minWidth: 0 }}>
      {/* Column headings, tradingview-style, each with a plain-language
          hover — they ARE the rail's header, no redundant "Markets" title
          above. Mirrors DirectionRow's grid exactly (including the 2px
          selection border) so the labels sit flush over their columns. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto',
          columnGap: 1,
          px: 1,
          pt: 0.25,
          pb: 0.75,
          borderLeft: '2px solid transparent',
        }}
      >
        <Tooltip
          title="The route: what you send → what arrives. Each direction is its own market with its own miners and rate."
          arrow
        >
          <Typography sx={railLabelSx}>Symbol</Typography>
        </Tooltip>
        <Tooltip
          title="The route's current best rate — what 1 unit sent delivers, in the receiving asset."
          arrow
        >
          <Typography sx={{ ...railLabelSx, minWidth: 64, textAlign: 'right' }}>
            Last
          </Typography>
        </Tooltip>
        <Tooltip
          title={`SOL value of this route's completed transactions over the selected window (${range}).`}
          arrow
        >
          <Typography sx={{ ...railLabelSx, minWidth: 44, textAlign: 'right' }}>
            Vol
          </Typography>
        </Tooltip>
        <Tooltip
          title={`Change in the route's rate over the selected window (${range}).`}
          arrow
        >
          <Typography sx={{ ...railLabelSx, minWidth: 52, textAlign: 'right' }}>
            Chg%
          </Typography>
        </Tooltip>
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {directions.map((d) => (
          <DirectionRow
            key={d}
            direction={d}
            selected={d === direction}
            secs={secs}
            onSelect={onDirectionChange}
          />
        ))}
      </Box>

      {/* Selected-route card: its live rate big, the reverse route and the
          pair spread as context, and 1D key stats. */}
      <Stack
        spacing={1}
        sx={{
          pt: 1.5,
          // Rows bleed edge-to-edge; the card indents to the rows' text
          // start (2px selection border + 8px cell padding).
          px: 1.25,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            fontFamily: FONTS.mono,
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          <RouteLabel direction={direction} logoSize={16} />
        </Box>
        <Stack direction="row" alignItems="baseline" spacing={0.75}>
          <Typography sx={{ ...railLabelSx }}>
            1 {from.toUpperCase()} =
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '1.25rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {selRate != null ? formatRate(selRate) : '—'}
          </Typography>
          <Typography sx={{ ...railLabelSx, color: 'text.disabled' }}>
            {to.toUpperCase()}
          </Typography>
        </Stack>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.68rem',
            color: 'text.secondary',
            display: 'flex',
            alignItems: 'baseline',
            columnGap: 1,
            flexWrap: 'wrap',
          }}
        >
          {/* Same pricing as the headline — the reverse route's quote
              inverted into this route's unit, so the two numbers compare
              directly, not a flipped conversion the reader has to invert in
              their head. The spread rides this secondary line, minimal by
              design: just the signed number in a move color. */}
          <Box component="span">
            reverse route: 1 {from.toUpperCase()} ={' '}
            {revImplied != null ? formatRate(revImplied) : '—'}{' '}
            {to.toUpperCase()}
          </Box>
          {spreadPct != null && (
            <Tooltip
              title="Spread: percent difference between this route's rate and the reverse route's (in the same unit). Positive means a round trip at these rates comes out ahead; negative means it loses this much."
              arrow
            >
              <Box
                component="span"
                sx={{ color: spreadColor, fontWeight: 600 }}
              >
                spread {spreadPct > 0 ? '+' : ''}
                {spreadPct.toFixed(2)}%
              </Box>
            </Tooltip>
          )}
        </Typography>
        <Box sx={{ pt: 0.5 }}>
          <Typography sx={{ ...railLabelSx, pb: 0.75 }}>
            Key stats · {range}
          </Typography>
          <StatsStrip
            bare
            directions={[direction]}
            secs={secs}
            rangeLabel={range}
          />
        </Box>
      </Stack>
    </Stack>
  );
};

export default PairsRail;
