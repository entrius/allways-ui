import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { useReservations } from '../../api';
import { FONTS } from '../../theme';
import { formatAmount } from '../../utils/format';

const STATUS_COLORS = (palette: {
  status: { active: string; fulfilled: string; timedOut: string };
}): Record<string, string> => ({
  ACTIVE: palette.status.active,
  INITIATED: palette.status.fulfilled,
  EXPIRED: palette.status.timedOut,
  CANCELLED: palette.status.timedOut,
});

const ReservationsTracker: React.FC = () => {
  const theme = useTheme();
  const { data, isLoading } = useReservations();
  const reservations = data ?? [];
  const colors = STATUS_COLORS(theme.palette);

  return (
    <Stack spacing={1.5} sx={{ height: '100%' }}>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        Reservations
      </Typography>

      {isLoading && (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color: 'text.secondary',
          }}
        >
          Loading…
        </Typography>
      )}

      {!isLoading && reservations.length === 0 && (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color: 'text.secondary',
          }}
        >
          No reservations yet.
        </Typography>
      )}

      <Stack spacing={0.75} sx={{ overflowY: 'auto', pr: 0.5 }}>
        {reservations.map((r) => {
          const statusColor = colors[r.status] ?? colors.ACTIVE;
          const sourceLabel =
            r.fromAmount && r.fromChain
              ? formatAmount(r.fromAmount, r.fromChain)
              : '—';
          const destLabel =
            r.toAmount && r.toChain ? formatAmount(r.toAmount, r.toChain) : '—';
          return (
            <Box
              key={r.requestHash}
              component={RouterLink}
              to={`/reservations/${r.requestHash}`}
              sx={{
                p: 1.25,
                borderRadius: 0,
                border: '1px solid',
                borderColor: 'divider',
                textDecoration: 'none',
                display: 'block',
                transition: 'border-color 0.15s, background-color 0.15s',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'background.paper',
                },
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.75rem',
                    color: 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sourceLabel} → {destLabel}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: statusColor,
                    flexShrink: 0,
                  }}
                >
                  {r.status}
                </Typography>
              </Stack>
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.65rem',
                  color: 'text.secondary',
                  mt: 0.25,
                }}
              >
                miner {r.minerHotkey.slice(0, 6)}… · until #
                {r.reservedUntilBlock}
                {r.swapId ? ` · swap #${r.swapId}` : ''}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default ReservationsTracker;
