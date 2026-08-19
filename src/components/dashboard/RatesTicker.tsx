import React, { useMemo } from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import {
  useCrownRateHistoryAll,
  useCurrentCrown,
  useDirections,
} from '../../api';
import {
  crownLaneFor,
  decomposeDirection,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { hubChains } from '../../api/models/chains';
import { formatRate } from '../../utils/format';
import { FONTS } from '../../theme';
import { ChainLogo } from '../index';
import Ticker from '../Ticker';
import { MOVE_COLORS } from './AllwaysMarketRate';

const DAY_SECS = 86_400;
const SEGMENT_FONT = { xs: '0.6rem', sm: '0.72rem' } as const;

// One tape segment, broadcast-ticker style: logo, FX symbol, last rate, and
// the 1D move with its ▲/▼ — the same numbers the watchlist carries, in
// crawl form.
const DirSegment: React.FC<{ direction: Direction }> = ({ direction }) => {
  const theme = useTheme();
  const { from, to } = decomposeDirection(direction);

  const { data: crown } = useCurrentCrown();
  // The ticker shows one rate per direction — the hub-leg lane (F4), which is
  // the only lane for a spoke and the SOL lane for sol↔tao (unchanged from before).
  const live = directionalRateFor(
    direction,
    crownLaneFor(crown, direction)?.rate,
  );
  // One batched series query shared by every segment of the crawl — the tape
  // used to cost a request per route it carried.
  const { data: allSeries } = useCrownRateHistoryAll(DAY_SECS);
  const rows = allSeries?.[direction];
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
    <Stack direction="row" spacing={0.75} alignItems="center">
      <ChainLogo chain={from} size={13} />
      <Typography
        variant="mono"
        sx={{
          fontSize: SEGMENT_FONT,
          color: 'text.secondary',
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        {from.toUpperCase()}
        <Box component="span" sx={{ color: 'text.disabled' }}>
          /
        </Box>
        {to.toUpperCase()}
      </Typography>
      <Typography
        variant="mono"
        sx={{
          fontSize: SEGMENT_FONT,
          color: 'text.primary',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {last != null ? formatRate(last) : '—'}
      </Typography>
      {chg != null && (
        <Typography
          variant="mono"
          sx={{
            fontSize: SEGMENT_FONT,
            color: chgColor,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {chg > 0 ? '▲' : chg < 0 ? '▼' : ''} {Math.abs(chg).toFixed(2)}%
        </Typography>
      )}
    </Stack>
  );
};

// Landing-page tape: the wall-street crawl, every route going by with its
// rate and 1D move. It belongs to the pitch rather than to the terminal.
// On the market page it was an eyebrow above a screen whose own rail already
// lists every route with live rates, so it repeated the page underneath it;
// here it runs as the page's top row, directly under the nav, where an
// exchange puts its tape and where it is the first thing to move.
//
// Edge-to-edge across the full viewport, not held to the 1400 measure the
// landing sections use: a tape reads as a broadcast strip running past the
// page, and stopping it at the content width would make it a wide panel
// instead. Self-contained, deliberately: it used to reach outside itself
// with negative margins mirroring one page's padding, which quietly made the
// component only usable on that page.
const RatesTicker: React.FC = () => {
  // Every registry pair with a hub leg, straight from das /chains.
  const directions = useDirections();

  // Hub-quoted routes only: SOL and TAO appear as the DENOMINATOR, never as
  // the leading side. Both directions of every pair put a hub logo first on
  // every other segment, so the tape crawled past as sol, btc, sol, tao,
  // sol, eth — the marks that identify a route at a glance were mostly the
  // same two. Quoting everything in the hubs is also what a tape does: one
  // unit of account, and the assets are what varies. The reverse routes are
  // still first-class instruments, on the market page's rail and in the
  // symbol search; this is the crawl, not the index.
  const hubs = hubChains();
  const quoted = useMemo(
    () =>
      directions.filter((d) => {
        const { from, to } = decomposeDirection(d);
        return !hubs.includes(from) && hubs.includes(to);
      }),
    // hubs comes from the registry singleton, which is stable for a given
    // directions list; keying off directions alone keeps this from
    // recomputing on every render for a new array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [directions],
  );

  return (
    <Box
      sx={{
        width: '100%',
        // No surface of its own: no tint, no rules. The tape simply runs
        // across the page's existing background at the top of it. A band
        // with a shade and a divider announced itself as another section
        // stacked above the hero, when the only thing it needs to be is a
        // line of live prices moving where the page begins. Motion already
        // separates it from everything that holds still.
      }}
    >
      <Stack
        direction="row"
        spacing={{ xs: 1.5, sm: 3 }}
        alignItems="center"
        sx={{
          fontFamily: FONTS.mono,
          fontSize: { xs: '0.6rem', sm: '0.72rem' },
          color: 'text.secondary',
          px: { xs: 1.5, sm: 2, md: 3 },
          py: { xs: 1, sm: 1.5 },
        }}
      >
        <Ticker>
          {quoted.map((d) => (
            <DirSegment key={d} direction={d} />
          ))}
        </Ticker>
      </Stack>
    </Box>
  );
};

export default RatesTicker;
