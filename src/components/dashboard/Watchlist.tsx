import React, { useMemo, useState } from 'react';
import { Box, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import {
  useChains,
  useCompleteSwapHistory,
  useCrownRateHistoryAll,
  useCurrentCrown,
  useDirections,
  useUsdPrices,
} from '../../api';
import {
  crownLaneFor,
  decomposeDirection,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { hubChains, hubLeg } from '../../api/models/chains';
import {
  canonicalSource,
  chainName,
  chainSymbol,
  formatRate,
  usdFromHuman,
} from '../../utils/format';
import { hubLegVolume } from './marketRate';
import { FONTS } from '../../theme';
import { ChainLogo } from '../ChainLogo';
import RailTooltip from './railTooltip';
import { MOVE_COLORS, type HeroRange, RANGE_SECS } from './AllwaysMarketRate';

// The watchlist, in the shape a TradingView user knows: one row per
// DIRECTION with its symbol, last rate, windowed volume and windowed move.
// Every direction is its own instrument quoted in its natural unit ("1 SOL
// sends 0.00097 BTC"), so a row is that route's crown and how it moved.
// This is the old market page's right rail, now a desk widget; the window
// follows the page's range toggle, so 1W on the chart is 1W here.

const ALL = 'all';

// Does either leg of this route settle on `hub`?
const touchesHub = (direction: Direction, hub: string): boolean => {
  const { from, to } = decomposeDirection(direction);
  return from === hub || to === hub;
};
// The one hub a route is FILED under. sol↔tao is reachable from both hubs
// but files under sol, so grouping by this lists every route exactly once.
const anchorHub = (direction: Direction): string | null => {
  const { from, to } = decomposeDirection(direction);
  return hubLeg(from, to);
};

// Compact volume readout: "55.4", "1.2k".
const fmtVol = (v: number) =>
  v >= 1000
    ? `${(v / 1000).toFixed(1)}k`
    : v.toLocaleString(undefined, { maximumFractionDigits: 1 });

// Percent move, held to the width of its column. Test lanes throw out
// things like +3546481.97%; past four digits it switches to compact
// notation (+3.5M%) so the magnitude survives and the layout does not move.
const fmtChg = (chg: number): string => {
  const sign = chg > 0 ? '+' : '';
  if (Math.abs(chg) >= 10000)
    return `${sign}${new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(chg)}%`;
  return `${sign}${chg.toFixed(2)}%`;
};

const labelSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.6rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'text.secondary',
} as const;

// ONE column definition for the header and every row: separate grids, so
// `auto` tracks would each size to their own content and the headings would
// never sit over their numbers. Symbol takes the slack.
const COLS = 'minmax(0, 1fr) 84px 64px 68px';
const GAP = 1;

// FX-style instrument label, "SOL/BTC" with the two chain marks slightly
// overlapped like a forex flag pair.
// Four deployments ticker as "USDC"; the registry name carries the network
// in parentheses ("USDC (Arbitrum)"), which the label shows muted after
// the ticker so one row reads unambiguously.
const networkOf = (chain: string): string | null =>
  /\((.+)\)/.exec(chainName(chain))?.[1] ?? null;

const ellipsisSx = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

const RouteLabel: React.FC<{ direction: Direction }> = ({ direction }) => {
  const { from, to } = decomposeDirection(direction);
  const network = networkOf(from) ?? networkOf(to);
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
        sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
      >
        <Box
          component="span"
          sx={{ display: 'inline-flex', position: 'relative', zIndex: 1 }}
        >
          <ChainLogo chain={from} size={14} />
        </Box>
        <Box component="span" sx={{ display: 'inline-flex', ml: -0.5 }}>
          <ChainLogo chain={to} size={14} />
        </Box>
      </Box>
      <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
        {chainSymbol(from)}
        <Box component="span" sx={{ color: 'text.disabled' }}>
          /
        </Box>
        {chainSymbol(to)}
      </Box>
      {network && (
        <Box
          component="span"
          sx={{
            ...labelSx,
            fontWeight: 500,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            ...ellipsisSx,
          }}
        >
          {network}
        </Box>
      )}
    </Box>
  );
};

const Row: React.FC<{
  direction: Direction;
  selected: boolean;
  /** Window length in seconds (the page's range toggle). */
  secs: number;
  onSelect: (direction: Direction) => void;
}> = ({ direction, selected, secs, onSelect }) => {
  const theme = useTheme();

  const { data: crown } = useCurrentCrown();
  const live = directionalRateFor(
    direction,
    crownLaneFor(crown, direction)?.rate,
  );
  // One batched series query shared by every row: react-query issues it
  // once per tick however many routes the registry holds.
  const { data: allSeries } = useCrownRateHistoryAll(secs);
  const rows = allSeries ? (allSeries[direction] ?? []) : undefined;

  // Windowed volume of this route's settled swaps, on the pair's hub-leg
  // side; one shared swap-history query, filtered per direction.
  const { from, to } = decomposeDirection(direction);
  const hub = canonicalSource(from, to);
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
      const v = hubLegVolume(s, hub);
      if (Number.isFinite(v)) sum += v;
    }
    return sum;
  }, [swaps, from, to, hub, secs]);
  // USD when the hub is priced; native hub units otherwise.
  const prices = useUsdPrices();
  const volUsd = usdFromHuman(vol, hub, prices);

  const first = rows?.length
    ? directionalRateFor(direction, rows[0].rate)
    : null;
  const last =
    live ??
    (rows?.length
      ? directionalRateFor(direction, rows[rows.length - 1].rate)
      : null);
  const ratio =
    first != null && first !== 0 && last != null ? last / first : null;
  // A scale-off quote seeding the window produces figures like +1.6e8%: a
  // re-denomination artifact, not a move. Beyond a 10× in-window swing the
  // number is suppressed rather than discredit the whole column.
  const chgArtifact = ratio != null && (ratio > 10 || ratio < 0.1);
  const chg = ratio != null && !chgArtifact ? (ratio - 1) * 100 : null;
  // Nothing traded and nothing moved in the window: keep the row, let the
  // live markets pop. The selected row is never dimmed.
  const dormant = !selected && vol === 0 && (chg == null || chg === 0);

  const move = MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  const chgColor =
    chg == null || chg === 0
      ? theme.palette.text.secondary
      : chg > 0
        ? move.up
        : move.down;

  const skeleton = (width: number) => (
    <Skeleton
      variant="text"
      width={width}
      sx={{ borderRadius: 0, display: 'inline-block' }}
    />
  );

  return (
    <Box
      component="button"
      type="button"
      data-dir={direction}
      onClick={() => onSelect(direction)}
      aria-pressed={selected}
      sx={{
        all: 'unset',
        width: '100%',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: COLS,
        alignItems: 'center',
        columnGap: GAP,
        px: 1.5,
        py: 0.75,
        borderLeft: '2px solid',
        borderLeftColor: selected ? 'text.primary' : 'transparent',
        backgroundColor: selected ? 'action.hover' : 'transparent',
        opacity: dormant ? 0.55 : 1,
        transition: 'opacity 0.15s',
        '&:hover': { backgroundColor: 'action.hover', opacity: 1 },
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
          overflow: 'hidden',
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
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {rows === undefined && last == null
          ? skeleton(48)
          : last != null
            ? formatRate(last)
            : '—'}
      </Typography>
      <Typography
        title={
          volUsd != null ? `${fmtVol(vol)} ${chainSymbol(hub)}` : undefined
        }
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.66rem',
          fontWeight: 500,
          color: 'text.secondary',
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {swaps === undefined
          ? skeleton(28)
          : volUsd != null
            ? `$${fmtVol(volUsd)}`
            : fmtVol(vol)}
      </Typography>
      <Typography
        title={
          chgArtifact
            ? 'rate scale changed inside this window; % change not meaningful'
            : undefined
        }
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.66rem',
          fontWeight: 600,
          color: chgArtifact ? 'text.disabled' : chgColor,
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {chg != null ? fmtChg(chg) : chgArtifact ? '—' : ''}
      </Typography>
    </Box>
  );
};

/**
 * The Watchlist desk widget: hub scope chips, column headings, and every
 * route as a row filed under the hub that settles it. Clicking a row
 * switches the page's instrument. Fills its widget and scrolls inside.
 */
const Watchlist: React.FC<{
  direction: Direction;
  range: HeroRange;
  onDirectionChange: (direction: Direction, hub: string) => void;
}> = ({ direction, range, onDirectionChange }) => {
  const secs = RANGE_SECS[range];
  // Every registry pair with a hub leg. A deep link must never lose its
  // market, so the selected route stays listed even if the registry has
  // not (yet) served its pair.
  const all = useDirections();
  const directions = useMemo<Direction[]>(
    () => (all.includes(direction) ? all : [direction, ...all]),
    [all, direction],
  );
  const { data: chains } = useChains();
  const hubs = useMemo(() => hubChains(chains), [chains]);
  const [scope, setScope] = useState<string>(ALL);

  // "All" files every route once, under its anchor, in registry hub order;
  // a hub scope is that hub's whole network, including the routes it
  // merely touches (sol↔tao files under sol but rides on both).
  const sections = useMemo(
    () =>
      scope === ALL
        ? hubs.map((h) => ({
            hub: h,
            rows: directions.filter((d) => anchorHub(d) === h),
          }))
        : [
            {
              hub: scope,
              rows: directions.filter((d) => touchesHub(d, scope)),
            },
          ],
    [scope, hubs, directions],
  );

  // Vol column wording follows whether rows can render USD.
  const prices = useUsdPrices();
  const usdMode = hubs.every((h) => typeof prices[h] === 'number');

  const select = (d: Direction) => {
    const legs = decomposeDirection(d);
    onDirectionChange(d, hubLeg(legs.from, legs.to) ?? legs.from);
  };

  return (
    <Stack sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>
      {/* Hub scope, in the site's segmented style: the meaningful split of
          a route list is which hub settles it. */}
      <Stack direction="row" spacing={0.5} sx={{ pb: 1, flexShrink: 0 }}>
        {[ALL, ...hubs].map((h) => {
          const on = h === scope;
          return (
            <Box
              key={h}
              component="button"
              type="button"
              onClick={() => setScope(h)}
              aria-pressed={on}
              sx={{
                all: 'unset',
                boxSizing: 'border-box',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                px: 1,
                py: 0.4,
                fontFamily: FONTS.mono,
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: on ? 'background.paper' : 'text.secondary',
                backgroundColor: on ? 'text.primary' : 'transparent',
                '&:hover': {
                  backgroundColor: on ? 'text.primary' : 'action.hover',
                },
              }}
            >
              {h !== ALL && <ChainLogo chain={h} size={13} />}
              {h === ALL ? 'All' : `${chainSymbol(h)} hub`}
            </Box>
          );
        })}
      </Stack>

      {/* Column headings, each with a plain-language hover. Same grid as
          the rows (including the 2px selection border) so the labels sit
          flush over their columns. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: COLS,
          columnGap: GAP,
          mx: -1.5,
          px: 1.5,
          pb: 0.75,
          borderLeft: '2px solid transparent',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <RailTooltip
          placement="bottom"
          title="What you send, and what arrives. Each direction is its own market, with its own miners and rate."
        >
          <Typography sx={labelSx}>Symbol</Typography>
        </RailTooltip>
        <RailTooltip
          placement="bottom"
          title="Best rate right now: what 1 unit sent delivers."
        >
          <Typography sx={{ ...labelSx, textAlign: 'right' }}>Last</Typography>
        </RailTooltip>
        <RailTooltip
          placement="bottom"
          title={
            usdMode
              ? `Value settled on this route over ${range}, estimated in USD.`
              : `Value settled on this route over ${range}, in the pair's hub asset.`
          }
        >
          <Typography sx={{ ...labelSx, textAlign: 'right' }}>Vol</Typography>
        </RailTooltip>
        <RailTooltip
          placement="bottom"
          title={`How far this route's rate moved over ${range}.`}
        >
          <Typography sx={{ ...labelSx, textAlign: 'right' }}>Chg%</Typography>
        </RailTooltip>
      </Box>

      {/* The list takes the rest of the widget and scrolls inside it; rows
          bleed to the widget's edges like the search results do. */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          mx: -1.5,
          mb: -1.5,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: (t) => t.palette.border.light,
            borderRadius: 0,
          },
        }}
      >
        {sections.map(({ hub, rows }) => (
          <Box key={hub}>
            {/* Which hub anchors the routes below; only earns its height
                when more than one section is on screen. */}
            {sections.length > 1 && (
              <Box
                sx={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.5,
                  py: 0.5,
                  backgroundColor: 'background.default',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <ChainLogo chain={hub} size={12} />
                <Typography sx={labelSx}>
                  {chainSymbol(hub)} hub · {rows.length}
                </Typography>
              </Box>
            )}
            {rows.map((d) => (
              <Row
                key={d}
                direction={d}
                selected={d === direction}
                secs={secs}
                onSelect={select}
              />
            ))}
          </Box>
        ))}
      </Box>
    </Stack>
  );
};

export default Watchlist;
