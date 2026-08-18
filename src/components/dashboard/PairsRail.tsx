import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import {
  useChains,
  useCompleteSwapHistory,
  useCrownRateHistory,
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
import {
  canonicalSource,
  chainName,
  chainSymbol,
  formatRate,
  usdFromHuman,
} from '../../utils/format';
import { hubChains, hubLeg } from '../../api/models/chains';
import { hubLegVolume } from './marketRate';
import { FONTS } from '../../theme';
import { ChainLogo } from '../ChainLogo';
import HubSpokeMap from './HubSpokeMap';
import RailTooltip from './railTooltip';
import StatsStrip from './StatsStrip';
import { MOVE_COLORS, type HeroRange, RANGE_SECS } from './AllwaysMarketRate';

// Does either leg of this route settle on `hub`? The hub↔hub corridor
// answers true for both hubs, which is correct: it genuinely belongs to each.
const touchesHub = (direction: Direction, hub: string): boolean => {
  const { from, to } = decomposeDirection(direction);
  return from === hub || to === hub;
};

// The non-hub leg of a route read from one hub's point of view.
const otherLeg = (direction: Direction, hub: string): string => {
  const { from, to } = decomposeDirection(direction);
  return from === hub ? to : from;
};

// The one hub a route is FILED under — its canonical anchor. Distinct from
// touchesHub: sol↔tao is reachable from both hubs but files under sol, so
// grouping by this covers every route exactly once.
const anchorHub = (direction: Direction): string | null => {
  const { from, to } = decomposeDirection(direction);
  return hubLeg(from, to);
};

// Scope chip that isn't a hub: every route at once, still grouped by anchor.
const ALL = 'all';

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

// Registry names run long ("USDC (Arbitrum)"), and a wrapped one would push
// the card taller on every selection change. They truncate instead.
const ellipsisSx = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

// ONE column definition for the header and every row. They are separate
// grids, so `auto` tracks would each size to their own content and the
// headings would never sit over their numbers — the widths have to be fixed
// and shared. Symbol takes the slack; the numeric columns are sized to their
// widest realistic value (a hub↔spoke ticker is at most 11 characters, since
// one leg is always a 3-letter hub).
const RAIL_COLS = 'minmax(0, 1fr) 74px 46px 60px';
const RAIL_GAP = 0.75;

// Percent move, held to the width of its column. Test lanes throw out things
// like +3546481.97%, which would blow the grid open if printed in full, so
// anything past four digits switches to compact notation (+3.5M%) — the
// magnitude survives, the layout does not move.
const fmtChg = (chg: number): string => {
  const sign = chg > 0 ? '+' : '';
  if (Math.abs(chg) >= 10000)
    return `${sign}${new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(chg)}%`;
  return `${sign}${chg.toFixed(2)}%`;
};

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

// One key-stats line: label left, value right, no rule. Mirrors
// StatsStrip's `rows` item so the card's own facts and the computed activity
// stats sit in a single uninterrupted list.
const StatRow: React.FC<{
  label: string;
  value: string;
  hint: string;
  valueColor?: string;
}> = ({ label, value, hint, valueColor }) => (
  <RailTooltip title={hint}>
    <Stack
      direction="row"
      alignItems="baseline"
      spacing={0.75}
      sx={{ justifyContent: 'space-between', width: '100%', py: 0.35 }}
    >
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.74rem',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          color: valueColor ?? 'text.primary',
        }}
      >
        {value}
      </Typography>
    </Stack>
  </RailTooltip>
);

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
  const live = directionalRateFor(
    direction,
    crownLaneFor(crown, direction)?.rate,
  );
  const { data: rows } = useCrownRateHistory({
    direction,
    secs,
  });

  // Windowed volume (the pair's hub-leg side, one denomination per route) of
  // this route's completed swaps — one shared swap-history query across all
  // rows, filtered per direction.
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
  // Estimated USD readout when the hub is priced; native hub units otherwise.
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
      data-dir={direction}
      onClick={() => onSelect(direction)}
      sx={{
        all: 'unset',
        // `all: unset` drops the block width too — re-stretch so the row's
        // columns line up with the header row above the list.
        width: '100%',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: RAIL_COLS,
        alignItems: 'center',
        columnGap: RAIL_GAP,
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
        }}
      >
        {last != null ? formatRate(last) : '—'}
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
        }}
      >
        {volUsd != null ? `$${fmtVol(volUsd)}` : fmtVol(vol)}
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.66rem',
          fontWeight: 600,
          color: chgColor,
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'right',
        }}
      >
        {chg != null ? fmtChg(chg) : ''}
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
  const { from, to } = decomposeDirection(direction);
  // Every registry pair with a hub leg, straight from das /chains. A deep
  // link must never lose its market, so the selected route stays pinned even
  // if the registry hasn't (yet) served its pair.
  const all = useDirections();
  const directions = useMemo<Direction[]>(
    () => (all.includes(direction) ? all : [direction, ...all]),
    [all, direction],
  );
  const reverseDir = `${to.toUpperCase()}-${from.toUpperCase()}` as Direction;

  // ── Hub scope ──
  // The registry's hubs, priority-ordered. A flat 62-row list makes the
  // thing that defines this network — which chain ANCHORS each pair — the
  // one fact you can't see. Scope chips fix that without hiding anything:
  // "All" keeps every route, just filed under its anchor hub.
  const { data: chains } = useChains();
  const hubs = useMemo(() => hubChains(chains), [chains]);
  const [scope, setScope] = useState<string>(ALL);

  // The hub the MAP draws. Under a hub scope that's the scope; under "All"
  // it follows the selected instrument, so the map always shows the network
  // the current route actually rides.
  const mapHub = useMemo(
    () =>
      scope !== ALL
        ? scope
        : (hubs.find((h) => touchesHub(direction, h)) ?? hubs[0]),
    [scope, hubs, direction],
  );

  // Follow the instrument when it moves off the open hub's network (the
  // chart's own picker and deep links both bypass the rail). Guarded on the
  // DIRECTION actually changing: opening a hub whose network the current
  // instrument isn't on is deliberate, and without this the effect would
  // immediately snap the scope back to where it came from.
  const lastDirection = useRef(direction);
  useEffect(() => {
    if (lastDirection.current === direction) return;
    lastDirection.current = direction;
    if (scope === ALL || touchesHub(direction, scope)) return;
    const next = hubs.find((h) => touchesHub(direction, h));
    if (next) setScope(next);
  }, [direction, scope, hubs]);

  // Opening a hub carries the spoke across when that corridor exists — from
  // SOL/BTC, the TAO hub opens on TAO/BTC. You keep watching the same asset,
  // routed through the other hub, instead of landing on an empty selection.
  const selectScope = (next: string) => {
    setScope(next);
    if (next === ALL || touchesHub(direction, next)) return;
    const current = hubs.find((h) => touchesHub(direction, h));
    if (!current) return;
    const carried =
      `${next.toUpperCase()}-${otherLeg(direction, current).toUpperCase()}` as Direction;
    if (directions.includes(carried)) onDirectionChange(carried);
  };

  // The list, as hub-anchored sections. "All" renders every hub's section in
  // registry priority order (each route filed once, under its anchor); a hub
  // scope renders that hub's whole network — including the routes it merely
  // touches, like sol↔tao, which file under the other hub.
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

  // The mapped hub's spoke set, derived from the same routes the rows
  // render so the map can never drift from the list.
  const spokes = useMemo(() => {
    const seen: string[] = [];
    for (const d of directions) {
      if (!touchesHub(d, mapHub)) continue;
      const leg = otherLeg(d, mapHub);
      if (!seen.includes(leg)) seen.push(leg);
    }
    // Other HUBS first, then the rest in registry order. Ring position comes
    // from this index, so without the hoist TAO sits third on the SOL map
    // while SOL sits first on the TAO map, and the two hubs appear to move
    // when you switch between them. Hoisting makes the maps structurally
    // identical: every asset keeps its place, and only the centre changes.
    return [
      ...seen.filter((leg) => hubs.includes(leg)),
      ...seen.filter((leg) => !hubs.includes(leg)),
    ];
  }, [directions, mapHub, hubs]);

  // Corridor volume per spoke over the page's window, all in the mapped
  // hub's units so one map's edge weights compare directly. Both directions
  // feed the one edge: an edge is the corridor, not an instrument.
  const { data: swaps } = useCompleteSwapHistory();
  const corridorVol = useMemo(() => {
    const out: Record<string, number> = {};
    const cutoff = Date.now() / 1000 - secs;
    for (const s of swaps ?? []) {
      if (
        s.status !== 'COMPLETED' ||
        s.initiatedAt == null ||
        Number(s.initiatedAt) < cutoff
      )
        continue;
      const src = s.sourceChain?.toLowerCase();
      const dst = s.destChain?.toLowerCase();
      if (!src || !dst) continue;
      const leg = src === mapHub ? dst : dst === mapHub ? src : null;
      if (!leg) continue;
      const v = hubLegVolume(s, mapHub);
      if (Number.isFinite(v)) out[leg] = (out[leg] ?? 0) + v;
    }
    return out;
  }, [swaps, mapHub, secs]);

  const selectedSpoke = touchesHub(direction, mapHub)
    ? otherLeg(direction, mapHub)
    : null;

  // Clicking a spoke opens its corridor hub-first; clicking the open one
  // again flips the instrument. Both directions stay first-class — the map
  // reaches each of them, it never collapses them into one quote.
  const selectSpoke = (spoke: string) => {
    const forward = `${mapHub.toUpperCase()}-${spoke.toUpperCase()}`;
    const reverse = `${spoke.toUpperCase()}-${mapHub.toUpperCase()}`;
    onDirectionChange((direction === forward ? reverse : forward) as Direction);
  };

  // Keep the selected route visible in the list when the map (or a deep
  // link) moves it — the list is long enough that it scrolls off screen.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-dir="${direction}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [direction, scope]);

  const { data: crown } = useCurrentCrown();
  const selRate = directionalRateFor(
    direction,
    crownLaneFor(crown, direction)?.rate,
  );
  const revRate = directionalRateFor(
    reverseDir,
    crownLaneFor(crown, reverseDir)?.rate,
  );
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
  // Windowed move for the headline, on the same footing as the rows' Chg%
  // column. The selected route's row already runs this query, so react-query
  // serves it from cache rather than refetching.
  const { data: selRows } = useCrownRateHistory({ direction, secs });
  const selChg = useMemo(() => {
    if (!selRows?.length || selRate == null) return null;
    const first = directionalRateFor(direction, selRows[0].rate);
    return first != null && first !== 0
      ? ((selRate - first) / first) * 100
      : null;
  }, [selRows, selRate, direction]);

  // Vol column header wording follows whether rows can render USD.
  const prices = useUsdPrices();
  const usdMode = hubChains().every((h) => typeof prices[h] === 'number');
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
      {/* Scope chips. "All" is the default and hides nothing — it is the
          full route list, only filed under the hub that anchors each one. A
          hub chip narrows to that hub's whole network. Rendered from the
          registry, so a third hub appears here with no UI edit. */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          px: 1,
          pt: 1,
          pb: 0.75,
          borderLeft: '2px solid transparent',
        }}
      >
        {[ALL, ...hubs].map((s_) => {
          const on = s_ === scope;
          const count =
            s_ === ALL
              ? directions.length
              : directions.filter((d) => touchesHub(d, s_)).length;
          return (
            <RailTooltip
              key={s_}
              placement="bottom"
              title={
                s_ === ALL
                  ? 'Every route, grouped under the hub that settles it. Spokes never trade directly against each other.'
                  : `${chainName(s_)} settles ${count} of the ${directions.length} routes. Show only its network.`
              }
            >
              <Box
                component="button"
                onClick={() => selectScope(s_)}
                sx={{
                  all: 'unset',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.4,
                  borderRadius: 1,
                  fontFamily: FONTS.mono,
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: on ? 'text.primary' : 'text.secondary',
                  backgroundColor: on ? 'action.selected' : 'transparent',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                {s_ === ALL ? (
                  `ALL ${count}`
                ) : (
                  <>
                    <ChainLogo chain={s_} size={14} />
                    {chainSymbol(s_)} HUB
                  </>
                )}
              </Box>
            </RailTooltip>
          );
        })}
      </Box>

      {/* The network itself. Doubles as the picker: the rows below are this
          same set read as a list. */}
      <Box sx={{ px: 1, pb: 1 }}>
        <HubSpokeMap
          hub={mapHub}
          spokes={spokes}
          selected={selectedSpoke}
          volumes={corridorVol}
          onSelect={selectSpoke}
          hubSelected={scope === mapHub}
          onSelectHub={(h) => selectScope(scope === h ? ALL : h)}
        />
      </Box>

      {/* Column headings, tradingview-style, each with a plain-language
          hover — they ARE the rail's header, no redundant "Markets" title
          above. Mirrors DirectionRow's grid exactly (including the 2px
          selection border) so the labels sit flush over their columns. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: RAIL_COLS,
          columnGap: RAIL_GAP,
          px: 1,
          pt: 0.25,
          pb: 0.75,
          borderLeft: '2px solid transparent',
        }}
      >
        <RailTooltip title="What you send, and what arrives. Each direction is its own market, with its own miners and rate.">
          <Typography sx={railLabelSx}>Symbol</Typography>
        </RailTooltip>
        <RailTooltip title="Best rate right now: what 1 unit sent delivers.">
          <Typography sx={{ ...railLabelSx, textAlign: 'right' }}>
            Last
          </Typography>
        </RailTooltip>
        <RailTooltip
          title={
            usdMode
              ? `Value settled on this route over ${range}, estimated in USD.`
              : `Value settled on this route over ${range}, in the pair's hub asset.`
          }
        >
          <Typography sx={{ ...railLabelSx, textAlign: 'right' }}>
            Vol
          </Typography>
        </RailTooltip>
        <RailTooltip title={`How far this route's rate moved over ${range}.`}>
          <Typography sx={{ ...railLabelSx, textAlign: 'right' }}>
            Chg%
          </Typography>
        </RailTooltip>
      </Box>
      <Box
        ref={listRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {sections.map(({ hub, rows }) => (
          <Box key={hub}>
            {/* Which hub anchors the routes below. Under a single-hub scope
                the map above already says it, so the band only earns its
                height when more than one section is on screen. */}
            {sections.length > 1 && (
              <Box
                sx={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.5,
                  backgroundColor: 'background.default',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <ChainLogo chain={hub} size={12} />
                <Typography sx={railLabelSx}>
                  {chainSymbol(hub)} hub · {rows.length}
                </Typography>
              </Box>
            )}
            {rows.map((d) => (
              <DirectionRow
                key={d}
                direction={d}
                selected={d === direction}
                secs={secs}
                onSelect={onDirectionChange}
              />
            ))}
          </Box>
        ))}
      </Box>

      {/* Selected-route card, symbol-page shape: identity, then the number,
          then a key-stats list. Bands are separated by whitespace and type
          weight rather than rules — a rail this narrow turns every rule into
          another horizontal line competing with the list borders above it. */}
      <Stack
        sx={{
          pt: 1.5,
          pb: 1,
          // Rows bleed edge-to-edge; the card indents to the rows' text
          // start (2px selection border + 8px cell padding).
          px: 1.25,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Full names and an arrow, not "SOL/QNT": the rows above are a
            dense scanning surface where tickers earn their brevity, but this
            card is where you confirm WHAT you are looking at before acting.
            The slash is also genuinely ambiguous about which side is sent,
            and four separate chains all ticker as "USDC". */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.6,
            fontSize: '0.85rem',
            fontWeight: 700,
            lineHeight: 1.2,
            minWidth: 0,
          }}
        >
          <ChainLogo chain={from} size={16} />
          <Box component="span" sx={ellipsisSx}>
            {chainName(from)}
          </Box>
          <Box component="span" sx={{ color: 'text.disabled', flexShrink: 0 }}>
            →
          </Box>
          <ChainLogo chain={to} size={16} />
          <Box component="span" sx={ellipsisSx}>
            {chainName(to)}
          </Box>
          {/* The route's move, pinned to the right of the names it belongs
              to. Away from the rate line it can't be misread as part of the
              received amount, and the names ellipsize before it gives up
              any width. */}
          {selChg != null && (
            <RailTooltip
              title={`How far this route's rate moved over ${range}.`}
            >
              <Box
                component="span"
                sx={{
                  ml: 'auto',
                  pl: 0.75,
                  flexShrink: 0,
                  fontFamily: FONTS.mono,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color:
                    selChg === 0
                      ? 'text.secondary'
                      : selChg > 0
                        ? move.up
                        : move.down,
                }}
              >
                {fmtChg(selChg)}
              </Box>
            </RailTooltip>
          )}
        </Box>

        {/* The exchange, on one line: what goes in, an arrow, what comes
            out. Two labelled rows said the same thing in twice the height,
            and the arrow carries direction more directly than the words
            Send and Receive did.

            Tickers here, not full names, and no logos: the identity row
            directly above carries both marks and both full names, so this
            line repeating either would state the same fact twice and cost
            the width that keeps it on one row. It is the arithmetic, and
            reads as arithmetic. The received amount stays the card's one big
            number. */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'center',
            gap: 0.5,
            minWidth: 0,
            pt: 1.5,
          }}
        >
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.88rem',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            1
          </Typography>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              whiteSpace: 'nowrap',
            }}
          >
            {chainSymbol(from)}
          </Typography>

          <Box
            component="span"
            sx={{ color: 'text.disabled', flexShrink: 0, px: 0.25 }}
          >
            →
          </Box>

          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '1.3rem',
              fontWeight: 700,
              lineHeight: 1.15,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {selRate != null ? formatRate(selRate) : '—'}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              ...ellipsisSx,
            }}
          >
            {chainSymbol(to)}
          </Typography>
        </Box>

        {/* Four stats, deliberately. This card sits under a map AND a
            scrolling list in one rail; a summary long enough to need its own
            scroll has stopped summarising. Spread takes the first slot as
            the only one describing the corridor's PRICE quality, and it
            carries the reverse route and its rate in its hint rather than
            spending two more rows on them. The other three are how the route
            has actually behaved over the window. In-flight goes: it is a
            live counter rather than a windowed stat, and /transactions is
            where you watch movement. */}
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, pt: 1.75 }}>
          Key stats
        </Typography>
        <Box sx={{ pt: 0.5 }}>
          <StatRow
            label="Spread"
            value={
              spreadPct != null
                ? `${spreadPct > 0 ? '+' : ''}${spreadPct.toFixed(2)}%`
                : '—'
            }
            valueColor={spreadPct != null ? spreadColor : undefined}
            hint={`Gap against the reverse route, ${chainSymbol(to)} → ${chainSymbol(from)}, which pays ${revImplied != null ? formatRate(revImplied) : '—'} in this route's unit. Positive: a round trip comes out ahead. Negative: it costs you this much.`}
          />
          <StatsStrip
            bare
            rows
            hideRange
            stats={['vol', 'txns', 'success']}
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
