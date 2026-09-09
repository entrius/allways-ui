import React, { useCallback, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { Page, SEO } from '../components';
import { PAGE_FRAME_SX } from '../components/layout/pageFrame';
import DirectionCard from '../components/dashboard/DirectionCard';
import OrderbookDepth from '../components/dashboard/OrderbookDepth';
import RateChart from '../components/dashboard/RateChart';
import RateMatrix from '../components/dashboard/RateMatrix';
import Workspace from '../components/workspace/Workspace';
import type { Layouts } from 'react-grid-layout';
import {
  isDirection,
  useCompleteSwapHistory,
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
import type { HeroRange } from '../components/dashboard/AllwaysMarketRate';

// Opening instrument when the URL says nothing and no swap has settled yet.
// Otherwise the page opens on the busiest direction (see busiestDirection).
const FALLBACK_DIRECTION: Direction = 'SOL-BTC';

// Windows tried in turn for "recent": the last day, then the week, then the
// month, so a quiet day still opens on something real.
const RECENT_WINDOWS_SECS = [86_400, 604_800, 2_592_000];

// The direction with the most settled volume in the most recent window that
// has any, in USD where the hub is priced (so SOL- and TAO-anchored routes
// compare), else in hub units.
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
      if (!Number.isFinite(v) || v <= 0) continue;
      vol.set(dir, (vol.get(dir) ?? 0) + (usdFromHuman(v, hub, prices) ?? v));
    }
    let best: Direction | null = null;
    let max = 0;
    for (const [dir, v] of vol) if (v > max) [best, max] = [dir, v];
    if (best) return best;
  }
  return null;
};

// The card, chart and book share one width, so the right side reads as a
// single column rather than three panels of different sizes.
// The page's own desk: the sheet down the left, the rate over its history
// over the book down the right. Twelve columns, 24px rows.
const MARKET_LAYOUTS: Layouts = {
  lg: [
    { i: 'matrix', x: 0, y: 0, w: 6, h: 40 },
    { i: 'rate', x: 6, y: 0, w: 6, h: 7 },
    { i: 'chart', x: 6, y: 7, w: 6, h: 12 },
    { i: 'book', x: 6, y: 19, w: 6, h: 21 },
  ],
  md: [
    { i: 'matrix', x: 0, y: 0, w: 6, h: 40 },
    { i: 'rate', x: 6, y: 0, w: 6, h: 7 },
    { i: 'chart', x: 6, y: 7, w: 6, h: 12 },
    { i: 'book', x: 6, y: 19, w: 6, h: 21 },
  ],
  sm: [
    { i: 'rate', x: 0, y: 0, w: 6, h: 7 },
    { i: 'matrix', x: 0, y: 7, w: 6, h: 24 },
    { i: 'chart', x: 0, y: 31, w: 6, h: 12 },
    { i: 'book', x: 0, y: 43, w: 6, h: 21 },
  ],
  xs: [
    { i: 'rate', x: 0, y: 0, w: 2, h: 7 },
    { i: 'matrix', x: 0, y: 7, w: 2, h: 24 },
    { i: 'chart', x: 0, y: 31, w: 2, h: 12 },
    { i: 'book', x: 0, y: 43, w: 2, h: 24 },
  ],
};

// The market page: every route's live crown rate on one sheet (the rate
// matrix, which is also the picker), with the selected direction's card and
// its pair's orderbook beside it. Everything transactional (history,
// reservations, events) lives on /network.
const MarketPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  // One window for the card's stats.
  const [range, setRange] = useState<HeroRange>('1H');

  // Where the page opens with nothing on the URL: the recent busiest cell.
  const { data: swaps } = useCompleteSwapHistory();
  const prices = useUsdPrices();
  const defaultDirection = useMemo(
    () => busiestDirection(swaps, prices) ?? FALLBACK_DIRECTION,
    [swaps, prices],
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
            book are panels a person drags and resizes into their own desk,
            the way a terminal lets them. The arrangement is remembered. */}
        <Workspace
          storageKey="allways.market.workspace.v1"
          defaultLayouts={MARKET_LAYOUTS}
          panels={[
            {
              id: 'matrix',
              title: 'Markets',
              minW: 4,
              minH: 8,
              node: (
                <RateMatrix
                  direction={direction}
                  base={base}
                  onDirectionChange={setDirection}
                />
              ),
            },
            {
              id: 'rate',
              title: 'Rate',
              minW: 3,
              minH: 5,
              node: (
                <DirectionCard
                  direction={direction}
                  base={base}
                  range={range}
                  onRangeChange={setRange}
                />
              ),
            },
            {
              id: 'chart',
              title: 'History',
              minW: 3,
              minH: 6,
              node: (
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <RateChart
                      direction={direction}
                      base={base}
                      range={range}
                      height="100%"
                    />
                  </Box>
                </Box>
              ),
            },
            {
              id: 'book',
              title: 'Order book',
              minW: 3,
              minH: 8,
              node: (
                <OrderbookDepth
                  direction={direction}
                  base={base}
                  onDirectionChange={setDirection}
                  embedded
                />
              ),
            },
          ]}
        />
      </Box>
    </Page>
  );
};

export default MarketPage;
