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

// Copy follows the trust research: concrete specifics over abstractions, the
// flat fee admitted up front (two-sided messages read as more honest), a named
// accountable party, and an explicit repayment guarantee. Titles are parallel
// and one line each so the four cards scan as one system.
const STEPS: Step[] = [
  {
    num: '01',
    title: 'Every pair is a market',
    body: 'BTC to TAO, SOL to BTC, and so on. Rates are posted up front, and every rate is backed by locked funds worth the full value of your transaction.',
  },
  {
    num: '02',
    title: 'See the exact amount',
    body: 'You know what will be delivered before you commit. The only fee is a flat 1%, already inside that number. Then you send from your own wallet.',
  },
  {
    num: '03',
    title: 'It lands where you say',
    body: "The real asset arrives at the destination you chose: your wallet, or the person you're paying. Not a wrapped token, not a voucher.",
  },
  {
    num: '04',
    title: 'Both sides get verified',
    body: 'Independent checkers confirm you sent and that delivery landed. If it does not arrive as promised, the locked funds repay you in full, automatically.',
  },
];

const HowItWorks: React.FC = () => (
  <Section
    eyebrow="How a transaction works"
    title="Four steps. Delivery guaranteed."
  >
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {STEPS.map((step) => (
        <Grid item xs={12} sm={6} md={3} key={step.num}>
          {/* height: 100% + shared type scale keeps all four cards identical,
              matching the Why Allways cards below. */}
          <HoverCard sx={{ p: { xs: 2.5, md: 3 }, height: '100%' }}>
            <Stack sx={{ height: '100%', gap: 1.75 }}>
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
                  fontSize: '1.15rem',
                  letterSpacing: '-0.01em',
                  color: 'text.primary',
                  lineHeight: 1.15,
                }}
              >
                {step.title}
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONTS.body,
                  fontSize: '0.85rem',
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
