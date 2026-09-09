import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { FONTS } from '../theme';

/**
 * How every page that has a title opens, in the landing page's rhythm: an
 * optional mono back link, then the brand-blue eyebrow, then the display
 * title, then (optionally) a lead paragraph. A slot on the right holds a
 * status chip row or a control, aligned with the title's baseline.
 *
 * Sizes are the landing `Section` title's, so a detail page's opening reads
 * exactly like "Four steps. Delivery guaranteed." on the home page.
 */
const PageIntro: React.FC<{
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  back?: { to: string; label: string };
  /** Chips, controls: sits to the right of the title on wide screens. */
  aside?: React.ReactNode;
  /** Space under the intro; the landing title uses { xs: 4, md: 6 }. */
  mb?: number | { xs: number; md: number };
}> = ({ eyebrow, title, lead, back, aside, mb = { xs: 4, md: 6 } }) => (
  <Box sx={{ mb }}>
    {back && (
      <Typography
        component={RouterLink}
        to={back.to}
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          mb: { xs: 2, md: 3 },
          '&:hover': { color: 'primary.main' },
        }}
      >
        <ArrowBackIcon sx={{ fontSize: 14 }} /> {back.label}
      </Typography>
    )}
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      alignItems={{ xs: 'flex-start', md: 'flex-end' }}
      justifyContent="space-between"
      gap={2}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="eyebrow" sx={{ display: 'block', mb: 1 }}>
          {eyebrow}
        </Typography>
        <Typography
          variant="display"
          sx={{
            fontSize: { xs: '1.75rem', md: '2.5rem' },
            letterSpacing: '-0.03em',
            color: 'text.primary',
            display: 'block',
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </Typography>
        {lead && (
          <Typography
            sx={{
              fontFamily: FONTS.body,
              fontSize: { xs: '0.95rem', md: '1.1rem' },
              color: 'text.secondary',
              maxWidth: 620,
              lineHeight: 1.55,
              mt: { xs: 2, md: 2.5 },
            }}
          >
            {lead}
          </Typography>
        )}
      </Box>
      {aside && <Box sx={{ flexShrink: 0, pb: { md: 0.5 } }}>{aside}</Box>}
    </Stack>
  </Box>
);

export default PageIntro;
