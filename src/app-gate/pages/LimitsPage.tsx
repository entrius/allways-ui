import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { FONTS } from '../../theme';
import { SEO } from '../../components';
import { GatePage } from '../ui';

// Limit / advanced orders are a teaser — presented, not functional.
const MockRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}
  >
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.72rem',
        color: 'text.secondary',
      }}
    >
      {label}
    </Typography>
    <Typography sx={{ fontFamily: FONTS.mono, fontSize: '0.72rem' }}>
      {value}
    </Typography>
  </Stack>
);

const LimitsPage: React.FC = () => (
  <GatePage
    eyebrow="Member"
    title="Limit orders"
    subtitle="Set a target rate and let Allways execute the swap when the market reaches it."
  >
    <SEO
      title="Limit orders"
      description="Automated limit orders — coming soon to Allways Access."
    />

    <Box sx={{ position: 'relative', maxWidth: 440 }}>
      <Stack
        aria-hidden
        sx={{
          p: 3,
          gap: 1.25,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          opacity: 0.35,
          filter: 'blur(0.5px)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
          New limit order
        </Typography>
        <MockRow label="When BTC → TAO ≥" value="28,500" />
        <MockRow label="Swap amount" value="0.05 BTC" />
        <MockRow label="Expires" value="7 days" />
        <Box
          sx={{
            mt: 1,
            py: 1.5,
            textAlign: 'center',
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            fontFamily: FONTS.mono,
            fontSize: '0.8rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Place order
        </Box>
      </Stack>

      <Stack
        sx={{
          position: 'absolute',
          inset: 0,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          px: 2,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: FONTS.heading,
            fontWeight: 900,
            fontSize: '1.1rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'primary.main',
            border: '1px solid',
            borderColor: 'primary.main',
            px: 2,
            py: 1,
            backgroundColor: 'background.default',
          }}
        >
          Coming Soon
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.body,
            fontSize: '0.9rem',
            color: 'text.secondary',
            maxWidth: 340,
            lineHeight: 1.5,
            backgroundColor: 'background.default',
            px: 1,
          }}
        >
          Automated limit orders are on the roadmap. Premium members get early
          access first.
        </Typography>
      </Stack>
    </Box>
  </GatePage>
);

export default LimitsPage;
