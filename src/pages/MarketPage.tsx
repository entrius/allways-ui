import React, { useCallback, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { Page, SEO } from '../components';
import { PAGE_FRAME_SX } from '../components/layout/pageFrame';
import DirectionCard from '../components/dashboard/DirectionCard';
import RateSettingsRows from '../components/dashboard/RateSettingsRows';
import {
  rateChanges,
  useRateSettings,
} from '../components/dashboard/rateSettings';
import OrderbookDepth from '../components/dashboard/OrderbookDepth';
import RateChart from '../components/dashboard/RateChart';
import ChartSettingsRows from '../components/dashboard/ChartSettingsRows';
import {
  chartChanges,
  useChartSettings,
} from '../components/dashboard/chartSettings';
import RateMatrix, {
  matrixUniverse,
  useMatrixAssets,
  visibleAssets,
} from '../components/dashboard/RateMatrix';
import MatrixFullView, {
  ExpandButton,
} from '../components/dashboard/MatrixFullView';
import { FONTS } from '../theme';
import RateMatrixSettings from '../components/dashboard/RateMatrixSettings';
import { useMatrixSettings } from '../components/dashboard/matrixSettings';
import WidgetSettings, {
  SettingsWidthRows,
} from '../components/workspace/WidgetSettings';
import {
  bookChanges,
  useBookSettings,
} from '../components/dashboard/bookSettings';
import RangeChips from '../components/RangeChips';
import Watchlist from '../components/dashboard/Watchlist';
import WatchlistSettingsRows from '../components/dashboard/WatchlistSettingsRows';
import {
  useWatchlistSettings,
  watchlistChanges,
} from '../components/dashboard/watchlistSettings';
import Workspace, { type Arrange } from '../components/workspace/Workspace';
import type { Layout, Layouts } from 'react-grid-layout';
import {
  isDirection,
  useCompleteSwapHistory,
  useDirections,
  useUsdPrices,
  type ActiveSwap,
} from '../api';
import { hubLegVolume } from '../components/dashboard/marketRate';
import { usdFromHuman, type UsdPrices } from '../utils/format';
import { hubChain, hubChains, hubLeg } from '../api/models/chains';
import {
  decomposeDirection,
  type Direction,
} from '../api/models/MinersDashboard';
import {
  RANGES,
  RANGE_SECS,
  type HeroRange,
} from '../components/dashboard/AllwaysMarketRate';

// The desk's window until the desk gear says otherwise.
const DEFAULT_RANGE: HeroRange = '1D';

// Opening instrument when the URL says nothing and no swap has settled yet.
// Otherwise the page opens on the busiest direction (see busiestDirection).
const FALLBACK_DIRECTION: Direction = 'SOL-BTC';

// Windows tried in turn: the desk's default window first (the page opens on
// the route with the most volume in the window it opens showing), then the
// longer ones, so a quiet day still opens on something real.
const RECENT_WINDOWS_SECS = RANGES.map((r) => RANGE_SECS[r]).filter(
  (secs) => secs >= RANGE_SECS[DEFAULT_RANGE],
);

// The direction with the most settled volume in the first of those windows
// that has any, in USD so every route compares (SOL-, TAO- and
// alpha-anchored alike): the swap's point-in-time dollars where das priced
// it, else its hub leg at today's price, else hub units.
const busiestDirection = (
  swaps: ActiveSwap[] | undefined,
  prices: UsdPrices,
): Direction | null => {
  if (!swaps?.length) return null;
  const now = Date.now() / 1000;
  for (const secs of RECENT_WINDOWS_SECS) {
    const cutoff = now - secs;
    const vol = new Map<Direction, number>();
    for (const s of swaps) {
      if (s.status !== 'COMPLETED' || s.initiatedAt == null) continue;
      if (Number(s.initiatedAt) < cutoff) continue;
      const src = s.sourceChain?.toLowerCase();
      const dst = s.destChain?.toLowerCase();
      if (!src || !dst) continue;
      const dir = `${src}-${dst}`.toUpperCase();
      if (!isDirection(dir)) continue;
      const hub = hubLeg(src, dst) ?? src;
      const v = hubLegVolume(s, hub);
      const usd = s.usdValue ?? usdFromHuman(v, hub, prices) ?? v;
      if (!Number.isFinite(usd) || usd <= 0) continue;
      vol.set(dir, (vol.get(dir) ?? 0) + usd);
    }
    let best: Direction | null = null;
    let max = 0;
    for (const [dir, v] of vol) if (v > max) [best, max] = [dir, v];
    if (best) return best;
  }
  return null;
};

// The page's own desk: the rate and its history across the top, the sheet
// under them filling the rest of the window, then the book and the
// watchlist (when a person adds them) side by side below.
const MARKET_LAYOUTS: Layouts = {
  lg: [
    { i: 'rate', x: 0, y: 0, w: 1, h: 36 },
    { i: 'chart', x: 1, y: 0, w: 2, h: 36 },
    { i: 'matrix', x: 0, y: 36, w: 3, h: 28 },
    { i: 'book', x: 0, y: 64, w: 2, h: 53 },
    { i: 'watchlist', x: 2, y: 64, w: 1, h: 53 },
  ],
  md: [
    { i: 'rate', x: 0, y: 0, w: 1, h: 36 },
    { i: 'chart', x: 1, y: 0, w: 1, h: 36 },
    { i: 'matrix', x: 0, y: 36, w: 2, h: 28 },
    { i: 'book', x: 0, y: 64, w: 1, h: 53 },
    { i: 'watchlist', x: 1, y: 64, w: 1, h: 53 },
  ],
  // One column: the rate, its history, the sheet, the book, the watchlist.
  sm: [
    { i: 'rate', x: 0, y: 0, w: 1, h: 25 },
    { i: 'chart', x: 0, y: 25, w: 1, h: 36 },
    { i: 'matrix', x: 0, y: 61, w: 1, h: 28 },
    { i: 'book', x: 0, y: 89, w: 1, h: 53 },
    { i: 'watchlist', x: 0, y: 142, w: 1, h: 56 },
  ],
  xs: [
    { i: 'rate', x: 0, y: 0, w: 1, h: 25 },
    { i: 'chart', x: 0, y: 25, w: 1, h: 36 },
    { i: 'matrix', x: 0, y: 61, w: 1, h: 28 },
    { i: 'book', x: 0, y: 89, w: 1, h: 63 },
    { i: 'watchlist', x: 0, y: 152, w: 1, h: 56 },
  ],
};

// Room the Matrix leaves under itself in the window: it sits under the
// rate and its history and fills the rest of the screen, scrolling inside.
const MATRIX_RESERVE = 24;

// A content card stretches at most this many desk rows past its content.
const CONTENT_STRETCH = 12;

// The page opens simple: the rate, its history and the sheet. The book and
// the watchlist are for traders who want depth; they wait in the bar, one
// click from the desk.
const ADVANCED_WIDGETS = ['book', 'watchlist'];

// The desk for the widgets' current widths, until a person drags
// something: rows fill left to right in the page's order (rate and history,
// then the sheet, then the book and watchlist), each widget in its own
// width, a new row when the next one does not fit. The rate is one column,
// so the history takes the rest of the top row. The grid packs heights.
const ORDER = ['rate', 'chart', 'matrix', 'book', 'watchlist'];
const HEIGHTS: Record<string, number> = {
  rate: 36,
  chart: 36,
  matrix: 28,
  book: 53,
  watchlist: 53,
};
const arrangeMarket: Arrange = (bp, cols, span, shown) => {
  if (cols < 2) return MARKET_LAYOUTS[bp] ?? MARKET_LAYOUTS.xs;
  const ids = ORDER.filter(shown);
  const out: Layout[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  ids.forEach((id, n) => {
    let w = Math.max(1, Math.min(cols, span(id)));
    // The history takes what the rate leaves on the top row.
    if (id === 'chart' && ids[n - 1] === 'rate' && x < cols) w = cols - x;
    if (x + w > cols) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    out.push({ i: id, x, y, w, h: HEIGHTS[id] });
    x += w;
    rowH = Math.max(rowH, HEIGHTS[id]);
  });
  return out;
};

// The market page: every route's live crown rate on one sheet (the rate
// matrix, which is also the picker), with the selected direction's card and
// its pair's orderbook beside it. Everything transactional (history,
// reservations, events) lives on /network.
const MarketPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  // The desk's window: the rate card's stats, the history, the watchlist
  // and the network map all read it, so it is picked once in the desk bar.
  const [range, setRange] = useState<HeroRange>(DEFAULT_RANGE);
  // The Matrix widget's settings live with the page: the sheet reads them
  // and the widget's gear (in its title row) edits them.
  const matrix = useMatrixSettings();
  // The sheet's natural width: the Matrix widget takes as many desk
  // columns as its columns need.
  const [matrixWidth, setMatrixWidth] = useState<number | undefined>();
  const matrixAssets = useMatrixAssets();
  const universe = useMemo(() => matrixUniverse(matrixAssets), [matrixAssets]);
  // The whole sheet over the full screen.
  const [fullMatrix, setFullMatrix] = useState(false);
  const matrixHidden =
    matrixAssets.length - visibleAssets(matrixAssets, matrix.settings).length;
  const watchlist = useWatchlistSettings();
  const rateCard = useRateSettings();
  const chart = useChartSettings();
  const book = useBookSettings();
  // Reset desk returns the whole page to its defaults: the widgets' places
  // (the desk's own part), the window, and every widget's settings, widths
  // included, with the stars kept.
  const resetDesk = useCallback(() => {
    setRange(DEFAULT_RANGE);
    // Back to the opening route: the busiest one in the default window.
    const next = new URLSearchParams(params);
    for (const k of ['dir', 'base', 'direction', 'pair']) next.delete(k);
    setParams(next, { replace: true });
    matrix.resetKeepStars();
    watchlist.reset();
    rateCard.reset();
    chart.reset();
    book.reset();
  }, [matrix, watchlist, rateCard, chart, book, params, setParams]);
  const deskDirty =
    range !== DEFAULT_RANGE ||
    matrixHidden > 0 ||
    matrix.settings.width !== 'fit' ||
    watchlistChanges(watchlist.settings) > 0 ||
    rateChanges(rateCard.settings) > 0 ||
    chartChanges(chart.settings) > 0 ||
    bookChanges(book.settings) > 0;

  // Where the page opens with nothing on the URL: the recent busiest cell.
  const { data: swaps } = useCompleteSwapHistory();
  const prices = useUsdPrices();
  // Subscribed to the registry so a deep link re-resolves once /chains lands.
  const directions = useDirections();
  const defaultDirection = useMemo(
    () => busiestDirection(swaps, prices) ?? FALLBACK_DIRECTION,
    // directions: isDirection reads the registry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [swaps, prices, directions],
  );

  // Selected DIRECTION, on the URL. Legacy links resolve too: ?direction=
  // directly, ?pair=BTC to that pair's forward route under the primary
  // hub; anything unrecognised falls back to the default.
  const dirParam =
    (params.get('dir') ?? params.get('direction'))?.toUpperCase() ?? null;
  const pairParam = params.get('pair')?.toUpperCase();
  const legacyDir = pairParam
    ? `${hubChain().toUpperCase()}-${pairParam}`
    : null;
  const direction: Direction = isDirection(dirParam)
    ? dirParam
    : isDirection(legacyDir)
      ? legacyDir
      : defaultDirection;

  // The hub column the cell was clicked in. The right side is denominated
  // the way the matrix is — the other asset per 1 of this hub — so the
  // number you clicked is the number you see. Only the hub↔hub pair can
  // differ from its anchor, so only then does it ride on the URL.
  const { from, to } = decomposeDirection(direction);
  const anchor = hubLeg(from, to) ?? from;
  const baseParam = params.get('base')?.toLowerCase();
  const base =
    baseParam &&
    (baseParam === from || baseParam === to) &&
    hubChains().includes(baseParam)
      ? baseParam
      : anchor;

  const setDirection = useCallback(
    (value: Direction, hub: string) => {
      const next = new URLSearchParams(params);
      next.delete('direction');
      next.delete('pair');
      if (value === defaultDirection) next.delete('dir');
      else next.set('dir', value);
      const legs = decomposeDirection(value);
      if (hub === (hubLeg(legs.from, legs.to) ?? legs.from))
        next.delete('base');
      else next.set('base', hub);
      // replace: picking a cell is not a navigation step.
      setParams(next, { replace: true });
    },
    [params, setParams, defaultDirection],
  );

  return (
    <Page>
      <SEO
        title="Markets"
        description="Live cross-chain rates for every route on Allways — Bittensor SN7"
      />
      {/* The site's one page frame; the matrix needs no heading, it is
          the page. */}
      <Box sx={PAGE_FRAME_SX}>
        {/* The page is a workspace: the sheet, the rate, its history and the
            book are fixed-size widgets a person puts away, brings back and
            drags into their own desk, the way a terminal lets them. The desk
            is remembered. */}
        <Workspace
          storageKey="allways.market.workspace.v17"
          defaultLayouts={MARKET_LAYOUTS}
          defaultHidden={ADVANCED_WIDGETS}
          arrange={arrangeMarket}
          layoutKey={[
            matrix.settings.width,
            watchlist.settings.width,
            chart.settings.width,
            book.settings.width,
          ].join('|')}
          dirty={deskDirty}
          controls={
            <RangeChips value={range} options={RANGES} onChange={setRange} />
          }
          onReset={resetDesk}
          panels={[
            {
              id: 'matrix',
              maxStretch: CONTENT_STRETCH,
              title: 'Matrix',
              widthPx: matrixWidth,
              columns:
                matrix.settings.width === 'fit'
                  ? undefined
                  : matrix.settings.width,
              flush: true,
              aside: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {universe.directions > 0 && (
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.6rem',
                        color: 'text.secondary',
                        display: { xs: 'none', sm: 'inline' },
                      }}
                    >
                      {universe.assets.toLocaleString()} assets ·{' '}
                      <Box
                        component="span"
                        sx={{ color: 'text.primary', fontWeight: 700 }}
                      >
                        {universe.directions.toLocaleString()}
                      </Box>{' '}
                      directions
                    </Typography>
                  )}
                  <ExpandButton onClick={() => setFullMatrix(true)} />
                  <WidgetSettings
                    label="Matrix settings"
                    width={272}
                    count={matrixHidden}
                    onReset={matrix.reset}
                  >
                    <RateMatrixSettings
                      assets={matrixAssets}
                      settings={matrix.settings}
                      update={matrix.update}
                      toggleHidden={matrix.toggleHidden}
                      toggleFavorite={matrix.toggleFavorite}
                    />
                  </WidgetSettings>
                </Box>
              ),
              node: (
                <RateMatrix
                  reserveBelow={MATRIX_RESERVE}
                  direction={direction}
                  base={base}
                  onDirectionChange={setDirection}
                  settings={matrix.settings}
                  toggleFavorite={matrix.toggleFavorite}
                  onNaturalWidth={setMatrixWidth}
                />
              ),
            },
            {
              id: 'rate',
              maxStretch: CONTENT_STRETCH,
              title: 'Rate',
              aside: (
                <WidgetSettings
                  label="Rate settings"
                  count={rateChanges(rateCard.settings)}
                  onReset={rateCard.reset}
                >
                  <RateSettingsRows
                    settings={rateCard.settings}
                    update={rateCard.update}
                  />
                </WidgetSettings>
              ),
              node: (
                <DirectionCard
                  direction={direction}
                  base={base}
                  range={range}
                  stats={rateCard.settings.stats}
                />
              ),
            },
            {
              id: 'chart',
              title: 'History',
              fit: 'fill',
              columns: chart.settings.width,
              // Beside the rate card, exactly its height: one row, no
              // dead space under the card, no chart growing into room
              // the widgets below leave.
              heightOf: 'rate',
              // 480px: taller than that the line only stretches.
              maxRows: 60,
              aside: (
                <WidgetSettings
                  label="History settings"
                  count={chartChanges(chart.settings)}
                  onReset={chart.reset}
                >
                  <ChartSettingsRows
                    settings={chart.settings}
                    update={chart.update}
                  />
                </WidgetSettings>
              ),
              node: (
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <RateChart
                      direction={direction}
                      base={base}
                      range={range}
                      height="100%"
                      readout={chart.settings.readout}
                    />
                  </Box>
                </Box>
              ),
            },
            {
              id: 'book',
              maxStretch: CONTENT_STRETCH,
              title: 'Order book',
              columns: book.settings.width,
              aside: (
                <WidgetSettings
                  label="Order book settings"
                  count={bookChanges(book.settings)}
                  onReset={book.reset}
                >
                  <SettingsWidthRows
                    value={book.settings.width}
                    options={[1, 2]}
                    onChange={(n) => book.update({ width: n === 1 ? 1 : 2 })}
                  />
                </WidgetSettings>
              ),
              node: (
                <OrderbookDepth
                  direction={direction}
                  base={base}
                  onDirectionChange={setDirection}
                  embedded
                />
              ),
            },
            {
              id: 'watchlist',
              title: 'Watchlist',
              fit: 'fill',
              columns: watchlist.settings.width,
              aside: (
                <WidgetSettings
                  label="Watchlist settings"
                  count={watchlistChanges(watchlist.settings)}
                  onReset={watchlist.reset}
                >
                  <WatchlistSettingsRows
                    settings={watchlist.settings}
                    update={watchlist.update}
                  />
                </WidgetSettings>
              ),
              node: (
                <Watchlist
                  fill
                  direction={direction}
                  range={range}
                  scope={watchlist.settings.scope}
                  directions={watchlist.settings.directions}
                  columns={watchlist.settings.columns}
                  favorites={watchlist.settings.favorites}
                  favoritesOnly={watchlist.settings.favoritesOnly}
                  onToggleFavorite={watchlist.toggleFavorite}
                  onDirectionChange={setDirection}
                />
              ),
            },
          ]}
        />
      </Box>
      <MatrixFullView
        open={fullMatrix}
        onClose={() => setFullMatrix(false)}
        assets={universe.assets}
        directions={universe.directions}
      >
        <RateMatrix
          full
          direction={direction}
          base={base}
          onDirectionChange={(d, hub) => {
            setDirection(d, hub);
            setFullMatrix(false);
          }}
          settings={{
            ...matrix.settings,
            favoritesOnly: false,
          }}
          toggleFavorite={matrix.toggleFavorite}
        />
      </MatrixFullView>
    </Page>
  );
};

export default MarketPage;
