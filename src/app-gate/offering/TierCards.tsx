import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { FONTS } from '../../theme';
import { TIERS, type Tier } from '../account/types';

const TierCards: React.FC<{
  onSelect: (tier: Tier) => void;
  currentTier?: Tier | null;
  ctaLabel?: string;
}> = ({ onSelect, currentTier, ctaLabel = 'Choose' }) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    spacing={2.5}
    sx={{ width: '100%' }}
  >
    {TIERS.map((tier) => {
      const featured = tier.id === 'premium';
      const isCurrent = currentTier === tier.id;
      return (
        <Box
          key={tier.id}
          sx={{
            flex: 1,
            p: { xs: 2.5, md: 3 },
            border: '1px solid',
            borderColor: featured ? 'primary.main' : 'divider',
            backgroundColor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {featured && (
            <Typography
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                fontFamily: FONTS.mono,
                fontSize: '0.58rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'primary.contrastText',
                backgroundColor: 'primary.main',
                px: 1,
                py: 0.4,
              }}
            >
              Priority
            </Typography>
          )}

          <Typography
            sx={{
              fontFamily: FONTS.heading,
              fontWeight: 800,
              fontSize: '1.25rem',
            }}
          >
            {tier.name}
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.body,
              fontSize: '0.85rem',
              color: 'text.secondary',
              mb: 2,
              minHeight: 38,
            }}
          >
            {tier.tagline}
          </Typography>

          <Stack
            direction="row"
            alignItems="baseline"
            spacing={0.75}
            sx={{ mb: 2.5 }}
          >
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontWeight: 700,
                fontSize: '2rem',
                lineHeight: 1,
              }}
            >
              {tier.priceTao}
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.78rem',
                color: 'text.secondary',
              }}
            >
              TAO / month
            </Typography>
          </Stack>

          <Stack spacing={1} sx={{ mb: 3, flex: 1 }}>
            {tier.features.map((f) => (
              <Stack
                key={f}
                direction="row"
                spacing={1}
                alignItems="flex-start"
              >
                <CheckIcon
                  sx={{ fontSize: 15, color: 'primary.main', mt: '2px' }}
                />
                <Typography
                  sx={{
                    fontFamily: FONTS.body,
                    fontSize: '0.85rem',
                    color: 'text.primary',
                  }}
                >
                  {f}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Button
            fullWidth
            variant={featured ? 'contained' : 'outlined'}
            color="primary"
            disabled={isCurrent}
            onClick={() => onSelect(tier.id)}
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.78rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              py: 1.25,
              boxShadow: 'none',
            }}
          >
            {isCurrent ? 'Current plan' : `${ctaLabel} ${tier.name}`}
          </Button>
        </Box>
      );
    })}
  </Stack>
);

export default TierCards;
