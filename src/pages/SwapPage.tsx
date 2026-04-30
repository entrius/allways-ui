import React from 'react';
import { Box, Button, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { FONTS } from '../theme';
import { Page, SEO, TokenInput } from '../components';

const SwapPage: React.FC = () => (
  <Page>
    <SEO
      title="Exchange"
      description="Exchange BTC ↔ TAO directly through Allways."
    />
    <Stack
      sx={{
        width: '100%',
        maxWidth: 480,
        mx: 'auto',
        px: 2,
        py: { xs: 6, md: 10 },
        flex: 1,
      }}
    >
      <Box sx={{ position: 'relative' }}>
        {/* Card (greyed + blurred, non-interactive) */}
        <Stack
          aria-hidden
          sx={{
            p: { xs: 2, md: 3 },
            gap: 1.25,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0,
            backgroundColor: 'surface.light',
            opacity: 0.35,
            filter: 'blur(0.5px)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              mb: 0.5,
            }}
          >
            Exchange
          </Typography>

          <TokenInput label="From" symbol="BTC" balance="0.000" />

          <Box
            sx={{
              alignSelf: 'center',
              p: 0.75,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.default',
              my: -1,
              zIndex: 1,
            }}
          >
            <ArrowDownwardIcon sx={{ fontSize: 16 }} />
          </Box>

          <TokenInput label="To" symbol="TAO" balance="0.000" />

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                color: 'text.secondary',
              }}
            >
              Rate
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                color: 'text.secondary',
              }}
            >
              — TAO / BTC
            </Typography>
          </Stack>

          <Button
            fullWidth
            size="large"
            variant="contained"
            disabled
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.85rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              py: 1.5,
              boxShadow: 'none',
              borderRadius: 0,
              mt: 1,
            }}
          >
            Exchange
          </Button>
        </Stack>

        {/* Coming Soon overlay */}
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
              maxWidth: 360,
              lineHeight: 1.5,
              backgroundColor: 'background.default',
              px: 1,
            }}
          >
            In-browser exchanges land soon. Today, exchange with the CLI or
            bring an agent —{' '}
            <Link
              component={RouterLink}
              to="/agents"
              sx={{
                color: 'primary.main',
                textDecoration: 'underline',
                fontWeight: 600,
              }}
            >
              get the agent bundle →
            </Link>
          </Typography>
        </Stack>
      </Box>
    </Stack>
  </Page>
);

export default SwapPage;
