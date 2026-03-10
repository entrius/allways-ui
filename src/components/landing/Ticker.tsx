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
    }}
  >
    //
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
    <Box className="ticker-track">
      {/* Duplicate content for seamless loop */}
      <Box sx={{ display: 'flex', alignItems: 'center', pr: 0 }}>
        <TickerContent />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', pr: 0 }}>
        <TickerContent />
      </Box>
    </Box>
  </Box>
);

export default Ticker;
