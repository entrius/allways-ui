import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { FONTS } from '../../theme';
import { SEO } from '../../components';
import { GatePage } from '../ui';
import ExchangeForm from '../exchange/ExchangeForm';

const ExchangePage: React.FC = () => (
  <GatePage
    eyebrow="Member"
    title="Exchange"
    subtitle="Swap BTC ↔ TAO directly through your whitelisted validator."
  >
    <SEO
      title="Exchange"
      description="Run a browser swap through your Allways Access membership."
    />
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={3}
      alignItems="flex-start"
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <ExchangeForm />
      </Box>
      <Box sx={{ flex: 1, pt: 1 }}>
        <Typography
          variant="monoSmall"
          sx={{
            letterSpacing: '0.15em',
            color: 'text.secondary',
            mb: 1.5,
            display: 'block',
          }}
        >
          How it works
        </Typography>
        <Stack spacing={1.25}>
          {[
            'Your membership whitelists this reservation with the validator.',
            'The validator reserves the best in-bounds miner for your rate.',
            'You send source funds; the miner fulfills the destination side.',
            'Settlement is verified on-chain and lands in your swap history.',
          ].map((line, i) => (
            <Stack key={line} direction="row" spacing={1.25}>
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.8rem',
                  color: 'primary.main',
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONTS.body,
                  fontSize: '0.88rem',
                  color: 'text.secondary',
                  lineHeight: 1.5,
                }}
              >
                {line}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Stack>
  </GatePage>
);

export default ExchangePage;
