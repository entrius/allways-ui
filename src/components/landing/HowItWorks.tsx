import React from 'react';
import { Grid, Stack, Typography } from '@mui/material';
import { FONTS } from '../../theme';
import HoverCard from '../HoverCard';
import Section from './Section';

interface Step {
  num: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    num: '01',
    title: 'Quote',
    body: 'Allways publishes live BTC↔TAO rates backed by on-chain collateral. The orderbook is fully on-chain.',
  },
  {
    num: '02',
    title: 'Initiate',
    body: 'User commits a transaction on-chain. Allways collateral locks. No custodian, no wrapped asset.',
  },
  {
    num: '03',
    title: 'Settle',
    body: 'Funds move peer to peer. Validators verify both sides. Failures auto-refund from collateral.',
  },
];

const HowItWorks: React.FC = () => (
  <Section eyebrow="How it works" title="Three steps. Zero trust.">
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {STEPS.map((step) => (
        <Grid item xs={12} md={4} key={step.num}>
          <HoverCard sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack sx={{ height: '100%', gap: 2 }}>
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
                variant="display"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.5rem', md: '1.75rem' },
                  letterSpacing: '-0.02em',
                  color: 'text.primary',
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
          </HoverCard>
        </Grid>
      ))}
    </Grid>
  </Section>
);

export default HowItWorks;
