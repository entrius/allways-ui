import React from 'react';
import { Box, Grid, Stack, Typography } from '@mui/material';
import { FONTS } from '../../theme';

interface Step {
  num: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    num: '01',
    title: 'Quote',
    body: 'Miners publish live BTC↔TAO rates and post collateral. The orderbook is fully on-chain.',
  },
  {
    num: '02',
    title: 'Initiate',
    body: 'You commit a swap on-chain. Miner collateral locks. No custodian, no wrapped asset.',
  },
  {
    num: '03',
    title: 'Settle',
    body: 'Funds move peer-to-peer. Validators verify both sides. Failures auto-refund from collateral.',
  },
];

const HowItWorks: React.FC = () => (
  <Box
    sx={{
      width: '100%',
      backgroundColor: 'background.default',
      borderBottom: '1px solid',
      borderColor: 'divider',
      px: { xs: 2, sm: 3, md: 6 },
      py: { xs: 6, md: 10 },
    }}
  >
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'primary.main',
          mb: 1,
        }}
      >
        How it works
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.heading,
          fontWeight: 900,
          fontSize: { xs: '1.75rem', md: '2.5rem' },
          letterSpacing: '-0.03em',
          textTransform: 'uppercase',
          color: 'text.primary',
          mb: { xs: 4, md: 6 },
          maxWidth: 700,
          lineHeight: 1,
        }}
      >
        Three steps. Zero trust.
      </Typography>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {STEPS.map((step) => (
          <Grid item xs={12} md={4} key={step.num}>
            <Stack
              sx={{
                p: { xs: 2.5, md: 3 },
                border: '1px solid',
                borderColor: 'divider',
                height: '100%',
                gap: 2,
                transition: 'border-color 120ms',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.85rem',
                  color: 'primary.main',
                  letterSpacing: '0.1em',
                }}
              >
                {step.num}
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONTS.heading,
                  fontWeight: 800,
                  fontSize: { xs: '1.5rem', md: '1.75rem' },
                  letterSpacing: '-0.02em',
                  color: 'text.primary',
                  lineHeight: 1,
                }}
              >
                {step.title}
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONTS.body,
                  fontSize: '0.9rem',
                  color: 'text.secondary',
                  lineHeight: 1.55,
                }}
              >
                {step.body}
              </Typography>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Box>
  </Box>
);

export default HowItWorks;
