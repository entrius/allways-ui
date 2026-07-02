import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { FONTS } from '../theme';
import type { SwapStatus } from './account/types';

// Page content container — consistent max width, padding, and header across the
// gate app.
export const GatePage: React.FC<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  maxWidth?: number;
  children: React.ReactNode;
}> = ({ eyebrow, title, subtitle, actions, maxWidth = 1040, children }) => (
  <Box
    sx={{
      width: '100%',
      maxWidth,
      mx: 'auto',
      px: { xs: 2, md: 4 },
      py: { xs: 3, md: 5 },
    }}
  >
    <Stack
      direction="row"
      alignItems="flex-end"
      justifyContent="space-between"
      sx={{ mb: { xs: 3, md: 4 }, gap: 2, flexWrap: 'wrap' }}
    >
      <Stack spacing={0.75}>
        {eyebrow && <Typography variant="eyebrow">{eyebrow}</Typography>}
        <Typography
          sx={{
            fontFamily: FONTS.heading,
            fontWeight: 800,
            fontSize: { xs: '1.6rem', md: '2rem' },
            lineHeight: 1,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            sx={{
              fontFamily: FONTS.body,
              fontSize: '0.92rem',
              color: 'text.secondary',
              maxWidth: 560,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Stack>
      {actions && <Box>{actions}</Box>}
    </Stack>
    {children}
  </Box>
);

// Bordered surface matching the dashboard card idiom (sharp corners, divider).
export const GateCard: React.FC<{ children: React.ReactNode; sx?: object }> = ({
  children,
  sx,
}) => (
  <Box
    sx={{
      p: { xs: 2, md: 2.5 },
      border: '1px solid',
      borderColor: 'divider',
      backgroundColor: 'background.paper',
      ...sx,
    }}
  >
    {children}
  </Box>
);

export const StatTile: React.FC<{
  label: string;
  value: string;
  hint?: string;
}> = ({ label, value, hint }) => (
  <GateCard>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.62rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontWeight: 600,
        fontSize: '1.5rem',
        mt: 0.5,
        lineHeight: 1.1,
      }}
    >
      {value}
    </Typography>
    {hint && (
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.66rem',
          color: 'text.secondary',
          mt: 0.5,
        }}
      >
        {hint}
      </Typography>
    )}
  </GateCard>
);

export const SectionLabel: React.FC<{ children: string }> = ({ children }) => (
  <Typography
    variant="monoSmall"
    sx={{
      letterSpacing: '0.15em',
      color: 'text.secondary',
      mb: 1.5,
      display: 'block',
    }}
  >
    {children}
  </Typography>
);

const STATUS_META: Record<SwapStatus, { label: string; color: string }> = {
  completed: { label: 'Completed', color: 'var(--color-success)' },
  active: { label: 'Active', color: 'var(--color-status-active)' },
  fulfilled: { label: 'Fulfilled', color: 'var(--color-status-fulfilled)' },
  timed_out: { label: 'Timed out', color: 'var(--color-danger)' },
};

export const StatusChip: React.FC<{ status: SwapStatus }> = ({ status }) => {
  const meta = STATUS_META[status];
  return (
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: meta.color,
        }}
      />
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'text.secondary',
        }}
      >
        {meta.label}
      </Typography>
    </Stack>
  );
};

export const EmptyState: React.FC<{
  title: string;
  hint?: string;
  action?: React.ReactNode;
}> = ({ title, hint, action }) => (
  <Stack
    alignItems="center"
    justifyContent="center"
    sx={{ py: 8, gap: 1.5, textAlign: 'center' }}
  >
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.85rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {title}
    </Typography>
    {hint && (
      <Typography
        sx={{
          fontFamily: FONTS.body,
          fontSize: '0.9rem',
          color: 'text.secondary',
          maxWidth: 380,
        }}
      >
        {hint}
      </Typography>
    )}
    {action}
  </Stack>
);
