import React from 'react';
import { Box, Grid, Stack, Typography } from '@mui/material';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import { FONTS } from '../../theme';

interface Prop {
  Icon: React.ElementType;
  title: string;
  body: string;
}

const PROPS: Prop[] = [
  {
    Icon: VerifiedUserOutlinedIcon,
    title: 'Trustless',
    body: 'Miner collateral guarantees delivery. The contract slashes on failure and refunds users automatically.',
  },
  {
    Icon: TrendingUpOutlinedIcon,
    title: 'Best rate',
    body: 'Open orderbook. Every miner competes on price every block. You always pick the best quote.',
  },
  {
    Icon: HubOutlinedIcon,
    title: 'Subnet-native',
    body: 'Built on Bittensor SN7. Settle in TAO, earn in TAO, watch the network in real time.',
  },
  {
    Icon: CodeOutlinedIcon,
    title: 'Open + agentic',
    body: 'Open source, public API, SSE feeds, and a one-click context bundle for AI agents.',
  },
];

const ValueProps: React.FC = () => (
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
        Why allways
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
        Built for the next million swaps.
      </Typography>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {PROPS.map(({ Icon, title, body }) => (
          <Grid item xs={12} sm={6} md={3} key={title}>
            <Stack
              sx={{
                p: { xs: 2.5, md: 3 },
                border: '1px solid',
                borderColor: 'divider',
                height: '100%',
                gap: 1.75,
                transition: 'border-color 120ms',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <Icon sx={{ fontSize: 22, color: 'primary.main' }} />
              <Typography
                sx={{
                  fontFamily: FONTS.heading,
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  letterSpacing: '-0.01em',
                  color: 'text.primary',
                }}
              >
                {title}
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONTS.body,
                  fontSize: '0.85rem',
                  color: 'text.secondary',
                  lineHeight: 1.55,
                }}
              >
                {body}
              </Typography>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Box>
  </Box>
);

export default ValueProps;
