import React, { useCallback, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { Page, SEO } from '../components';
import DirectionCard from '../components/dashboard/DirectionCard';
import OrderbookDepth from '../components/dashboard/OrderbookDepth';
import RateChart from '../components/dashboard/RateChart';
import RateMatrix from '../components/dashboard/RateMatrix';
import { isDirection } from '../api';
import { hubChain, hubChains, hubLeg } from '../api/models/chains';
import {
  decomposeDirection,
  type Direction,
} from '../api/models/MinersDashboard';
import type { HeroRange } from '../components/dashboard/AllwaysMarketRate';

// Opening instrument when the URL says nothing. Kept off the URL so a bare
// /market and /market?dir=SOL-BTC render the same thing.
const DEFAULT_DIRECTION: Direction = 'SOL-BTC';

// The card, chart and book share one width, so the right side reads as a
// single column rather than three panels of different sizes.
const PANEL_W = 560;

// The market page: every route's live crown rate on one sheet (the rate
// matrix, which is also the picker), with the selected direction's card and
// its pair's orderbook beside it. Everything transactional (history,
// reservations, events) lives on /network.
const MarketPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  // One window for the card's stats.
  const [range, setRange] = useState<HeroRange>('1H');

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
      : DEFAULT_DIRECTION;

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
      if (value === DEFAULT_DIRECTION) next.delete('dir');
      else next.set('dir', value);
      const legs = decomposeDirection(value);
      if (hub === (hubLeg(legs.from, legs.to) ?? legs.from))
        next.delete('base');
      else next.set('base', hub);
      // replace: picking a cell is not a navigation step.
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  return (
    <Page>
      <SEO
        title="Markets"
        description="Live cross-chain rates for every route on Allways — Bittensor SN7"
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'stretch',
          // Centred block with breathing room either side, rather than the
          // sheet starting hard against the left edge of the viewport.
          width: '100%',
          maxWidth: 1400,
          mx: 'auto',
          px: { xs: 0, md: 3 },
          // One screen below the 56px nav on desktop; each side scrolls on
          // its own. Auto height, stacked, on mobile.
          height: { xs: 'auto', md: 'calc(100dvh - 56px)' },
          minHeight: 0,
        }}
      >
        {/* Two equal halves, so the rule between them sits at the centre
            of the screen. The sheet scrolls inside its half if it is wider. */}
        <Box sx={{ flex: '1 1 0', minWidth: 0, minHeight: 0 }}>
          <RateMatrix
            direction={direction}
            base={base}
            onDirectionChange={setDirection}
          />
        </Box>
        <Stack
          sx={{
            flex: '1 1 0',
            minWidth: 0,
            minHeight: 0,
            overflowY: 'auto',
            gap: 3,
            px: { xs: 1.5, sm: 2, md: 3 },
            py: 2,
            borderLeft: { md: '1px solid' },
            borderColor: { md: 'divider' },
          }}
        >
          <Box sx={{ maxWidth: PANEL_W, minWidth: 0 }}>
            <DirectionCard
              direction={direction}
              base={base}
              range={range}
              onRangeChange={setRange}
            />
          </Box>
          {/* The rate over the window, on the same ruler as the card above
              and the book below. */}
          <Box sx={{ maxWidth: PANEL_W, minWidth: 0 }}>
            <RateChart direction={direction} base={base} range={range} />
          </Box>
          {/* Capped like the card: the stacked ladders read at one width,
              and a wide screen keeps its blank space rather than stretching
              them. */}
          <Box
            sx={{
              maxWidth: PANEL_W,
              minHeight: { xs: 300, md: 220 },
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
            }}
          >
            <OrderbookDepth direction={direction} base={base} />
          </Box>
        </Stack>
      </Box>
    </Page>
  );
};

export default MarketPage;
