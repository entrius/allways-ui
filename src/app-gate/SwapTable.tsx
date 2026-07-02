import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { FONTS } from '../theme';
import type { SwapRecord } from './account/types';
import { StatusChip } from './ui';
import { directionLabel, formatDateTime } from './format';

const HeaderCell: React.FC<{ children: string; align?: 'left' | 'right' }> = ({
  children,
  align = 'left',
}) => (
  <Typography
    sx={{
      fontFamily: FONTS.mono,
      fontSize: '0.6rem',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'text.secondary',
      textAlign: align,
    }}
  >
    {children}
  </Typography>
);

// Compact swap history table. `limit` trims rows for the Overview preview.
const SwapTable: React.FC<{ swaps: SwapRecord[]; limit?: number }> = ({
  swaps,
  limit,
}) => {
  const rows = limit ? swaps.slice(0, limit) : swaps;
  const gridCols = '1.1fr 1fr 1fr 1fr 0.9fr';

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', sm: 'grid' },
          gridTemplateColumns: gridCols,
          gap: 1,
          px: 2,
          py: 1.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <HeaderCell>Direction</HeaderCell>
        <HeaderCell align="right">Sent</HeaderCell>
        <HeaderCell align="right">Received</HeaderCell>
        <HeaderCell align="right">Rate</HeaderCell>
        <HeaderCell align="right">Status</HeaderCell>
      </Box>

      {rows.map((s) => {
        const btcToTao = s.direction === 'BTC_TO_TAO';
        return (
          <Box
            key={s.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: gridCols },
              gap: 1,
              px: 2,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:last-of-type': { borderBottom: 'none' },
              alignItems: 'center',
            }}
          >
            <Stack>
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                {directionLabel(s.direction)}
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.62rem',
                  color: 'text.secondary',
                }}
              >
                {formatDateTime(s.createdAt)}
              </Typography>
            </Stack>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.8rem',
                textAlign: { xs: 'right', sm: 'right' },
              }}
            >
              {s.sourceAmount} {btcToTao ? 'BTC' : 'TAO'}
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.8rem',
                textAlign: 'right',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              {s.destAmount} {btcToTao ? 'TAO' : 'BTC'}
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.8rem',
                color: 'text.secondary',
                textAlign: 'right',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              {s.rate}
            </Typography>
            <Box
              sx={{
                justifySelf: { xs: 'start', sm: 'end' },
                gridColumn: { xs: '1 / -1', sm: 'auto' },
              }}
            >
              <StatusChip status={s.status} />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default SwapTable;
