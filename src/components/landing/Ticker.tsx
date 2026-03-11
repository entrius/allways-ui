import React from 'react';
import { Box, Typography } from '@mui/material';
import { COLORS, FONTS } from '../../theme';

const TICKER_ITEMS = [
  'Powered by Bittensor',
  'Decentralized AI Infrastructure',
  'Subnet Intelligence',
  'TAO Network',
  'Open Source',
  'Autonomous Systems',
  'Distributed Computing',
  'Neural Consensus',
];

const Separator: React.FC = () => (
  <Typography
    component="span"
    sx={{
      fontFamily: FONTS.mono,
      fontSize: { xs: '0.7rem', md: '0.8rem' },
      fontWeight: 500,
      color: COLORS.tickerText,
      mx: 2,
      opacity: 0.5,
      flexShrink: 0,
    }}
  >
    ⬡
  </Typography>
);

const TickerContent: React.FC = () => (
  <>
    {TICKER_ITEMS.map((item, i) => (
      <React.Fragment key={i}>
        <Typography
          component="span"
          sx={{
            fontFamily: FONTS.mono,
            fontSize: { xs: '0.7rem', md: '0.8rem' },
            fontWeight: 500,
            color: COLORS.tickerText,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {item}
        </Typography>
        <Separator />
      </React.Fragment>
    ))}
  </>
);

const Ticker: React.FC = () => (
  <Box
    sx={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: COLORS.ticker,
      overflow: 'hidden',
      py: 1.2,
    }}
  >
    {/*
     * The trick to a seamless ticker: the track contains two identical halves.
     * The animation translates by exactly -50%, so when the first half scrolls
     * off-screen, the second half is in the exact same starting position —
     * making the loop reset invisible.
     *
     * We use an inner wrapper with `display: inline-flex` + `width: max-content`
     * so the track is sized by its content rather than the viewport, which
     * guarantees translateX(-50%) = exactly one copy's width.
     */}
    <Box
      sx={{
        display: 'inline-flex',
        width: 'max-content',
        animation: 'ticker-scroll 30s linear infinite',
        '&:hover': { animationPlayState: 'running' },
      }}
    >
      {/* 4 copies ensures content always fills the viewport.
          translateX(-50%) still resets at the halfway point (2 copies worth),
          so the loop is seamless regardless of screen width. */}
      {[0, 1, 2, 3].map((n) => (
        <Box
          key={n}
          sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <TickerContent />
        </Box>
      ))}
    </Box>
  </Box>
);

export default Ticker;
