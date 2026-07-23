import React, { useCallback, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import {
  AllwaysMarketRate,
  OrderbookDepth,
  PairsRail,
  RatesTicker,
  Page,
  SEO,
} from '../components';
import { isDirection } from '../api';
import type { Direction } from '../api/models/MinersDashboard';
import type { HeroRange } from '../components/dashboard/AllwaysMarketRate';

// Opening instrument when the URL says nothing. Kept off the URL so a bare
// /market and /market?dir=SOL-BTC render the same thing.
const DEFAULT_DIRECTION: Direction = 'SOL-BTC';

// Trading-terminal page for ONE instrument — a DIRECTION, the thing people
// actually trade on Allways — in the tradingview shape: the rate chart owns
// most of the viewport, the pair's orderbook sits beneath it, and the
// markets watchlist keeps its rail on the right. Everything transactional
// (history, reservations, events) lives on /transactions, the explorer side
// of the split.
const MarketPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  // One window for the whole page: the chart's range chips also set what
  // the rail's vol/chg/key-stats windows cover.
  const [range, setRange] = useState<HeroRange>('1D');

  // Shared INSTRUMENT — the watchlist and the hero's picker both drive it.
  // Legacy links resolve too: ?direction=SOL-BTC directly, ?pair=BTC to the
  // pair's forward route; anything unrecognised falls back to the default
  // rather than rendering empty panels.
  const dirParam =
    (params.get('dir') ?? params.get('direction'))?.toUpperCase() ?? null;
  const pairParam = params.get('pair')?.toUpperCase();
  const direction: Direction = isDirection(dirParam)
    ? dirParam
    : pairParam && /^[A-Z0-9]+$/.test(pairParam) && pairParam !== 'SOL'
      ? (`SOL-${pairParam}` as Direction)
      : DEFAULT_DIRECTION;

  const setDirection = useCallback(
    (value: Direction) => {
      // Clone so unrelated params on the URL survive the write.
      const next = new URLSearchParams(params);
      next.delete('direction');
      next.delete('pair');
      if (value === DEFAULT_DIRECTION) next.delete('dir');
      else next.set('dir', value);
      // replace: toggling an instrument is not a navigation step; the back
      // button should leave the page, not walk back through toggles.
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  return (
    <Page>
      <SEO
        title="Markets"
        description="Live cross-chain market rates on Allways — Bittensor SN7"
      />
      <Stack
        sx={{
          backgroundColor: 'background.default',
          px: { xs: 1.5, sm: 2, md: 3 },
          pt: 0,
          pb: { xs: 2, md: 2 },
          width: '100%',
          // Fill the viewport below the 56px top nav so the terminal is a
          // single screen; panels scroll internally. Auto height on mobile.
          height: { xs: 'auto', md: 'calc(100dvh - 56px)' },
          minHeight: 0,
          overflow: { md: 'hidden' },
        }}
      >
        <RatesTicker />

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gap: { xs: 3, md: 2.5 },
            // tradingview split: chart + orderbook own the width, the pairs
            // watchlist keeps its rail on the right (desktop only — the
            // hero's own picker covers pair switching when stacked).
            gridTemplateColumns: { xs: '1fr', md: '1fr 340px' },
          }}
        >
          <Box
            sx={{
              minHeight: 0,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 3, md: 2 },
            }}
          >
            {/* The chart is the page: it gets the dominant share of height. */}
            <Box
              sx={{
                flex: 1.7,
                minHeight: { xs: 320, md: 0 },
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <AllwaysMarketRate
                direction={direction}
                onDirectionChange={setDirection}
                quoteInRail
                range={range}
                onRangeChange={setRange}
              />
            </Box>

            {/* Liquidity row: the pair's two-sided orderbook. */}
            <Box
              sx={{
                flex: 1,
                minHeight: { xs: 300, md: 180 },
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              <OrderbookDepth direction={direction} />
            </Box>
          </Box>

          {/* No inner padding: watchlist rows own the rail's full width so
              their hover/selection background runs edge to edge. */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              minHeight: 0,
              borderLeft: '1px solid',
              borderColor: 'divider',
            }}
          >
            <PairsRail
              direction={direction}
              onDirectionChange={setDirection}
              range={range}
            />
          </Box>
        </Box>
      </Stack>
    </Page>
  );
};

export default MarketPage;
