import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useAllSwaps, useCurrentCrown } from '../../api';
import type { Direction } from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import { BlockIndicator } from '../index';
import CrownIcon from '../miners/CrownIcon';
import { latestEmaRate } from './marketRate';

const DIRECTIONS: Direction[] = ['BTC-TAO', 'TAO-BTC'];

// Mirrors the miners-page StickyNetworkHeader eyebrow — block height plus the
// current crown holder per direction — and adds the live EMA rate for each
// direction. No last-refresh / health segment.
const RatesTicker: React.FC = () => {
  const { data: crown } = useCurrentCrown();
  const { data: swaps } = useAllSwaps({ limit: 600 });

  return (
    <Stack
      direction="row"
      spacing={3}
      alignItems="center"
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.72rem',
        color: 'text.secondary',
        flexWrap: 'wrap',
        gap: 2,
        pt: 1.5,
        pb: 1.5,
        mb: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <BlockIndicator />
      <Stack
        direction="row"
        spacing={3}
        alignItems="center"
        sx={{ flexWrap: 'wrap', gap: { xs: 1.5, md: 3 } }}
      >
        {DIRECTIONS.map((dir) => {
          const h = crown?.[dir];
          const [from, to] = dir.split('-');
          const emaRate = latestEmaRate(swaps, dir);
          return (
            <Stack
              key={dir}
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{ color: 'text.secondary' }}
            >
              <CrownIcon />
              <Typography variant="mono" sx={{ fontSize: '0.72rem' }}>
                {from}
                <Box component="span" sx={{ mx: 0.5, color: 'text.disabled' }}>
                  →
                </Box>
                {to}
              </Typography>
              {h?.uid != null ? (
                <Typography
                  variant="mono"
                  sx={{ fontSize: '0.72rem', color: 'text.primary', ml: 0.5 }}
                >
                  uid {h.uid}
                </Typography>
              ) : (
                <Typography
                  variant="mono"
                  sx={{ fontSize: '0.72rem', color: 'text.disabled', ml: 0.5 }}
                >
                  no crown
                </Typography>
              )}
              {emaRate != null && (
                <>
                  <Box
                    component="span"
                    sx={{ color: 'text.disabled', mx: 0.5 }}
                  >
                    ·
                  </Box>
                  {/* Same 0.72rem mono as the rest of the segment — emphasis is
                      color/weight only, never a different size or font. */}
                  <Box
                    component="span"
                    sx={{ fontSize: '0.72rem', color: 'text.disabled' }}
                  >
                    market rate
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: 500,
                      color: 'text.primary',
                      ml: 0.5,
                    }}
                  >
                    {emaRate.toFixed(2)}
                    <Box
                      component="span"
                      sx={{
                        color: 'text.secondary',
                        ml: 0.25,
                        fontWeight: 400,
                      }}
                    >
                      τ
                    </Box>
                  </Box>
                </>
              )}
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default RatesTicker;
