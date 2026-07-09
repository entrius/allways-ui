import React from 'react';
import { Box, Stack } from '@mui/material';
import { useAllSwaps, useCurrentCrown } from '../../api';
import { ALL_DIRECTIONS } from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import { BlockIndicator } from '../index';
import CrownDirectionSegment from '../miners/CrownDirectionSegment';
import { latestEmaRate } from './marketRate';
import { formatRate } from '../../utils/format';

const DIRECTIONS = ALL_DIRECTIONS;

// Mirrors the miners-page StickyNetworkHeader eyebrow — the "updated <ago>"
// indicator plus the current crown holder and its live rate per direction
// (uid N @ rate SOL), then the smoothed EMA market rate. No last-refresh /
// health segment. Both share CrownDirectionSegment; only the EMA suffix is ours.
const RatesTicker: React.FC = () => {
  const { data: crown } = useCurrentCrown();
  const { data: swaps } = useAllSwaps({ limit: 600 });

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0.5, sm: 3 }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      sx={{
        fontFamily: FONTS.mono,
        fontSize: { xs: '0.6rem', sm: '0.72rem' },
        color: 'text.secondary',
        flexWrap: 'wrap',
        gap: { xs: 0.5, sm: 2 },
        rowGap: { xs: 0.5, sm: 1 },
        pt: { xs: 1, sm: 1.5 },
        pb: { xs: 1, sm: 1.5 },
        mb: { xs: 1.5, sm: 2 },
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <BlockIndicator />
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 0.5, sm: 3 }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ flexWrap: 'wrap', gap: { xs: 0.5, md: 3 } }}
      >
        {DIRECTIONS.map((dir) => {
          const emaRate = latestEmaRate(swaps, dir);
          return (
            <CrownDirectionSegment
              key={dir}
              direction={dir}
              holder={crown?.[dir]}
              emptyLabel="no crown"
            >
              {emaRate != null && (
                <>
                  <Box
                    component="span"
                    sx={{ color: 'text.disabled', mx: 0.5 }}
                  >
                    ·
                  </Box>
                  {/* Same size as the rest of the segment — emphasis is
                      color/weight only, never a different size or font. */}
                  <Box
                    component="span"
                    sx={{
                      fontSize: { xs: '0.6rem', sm: '0.72rem' },
                      color: 'text.disabled',
                    }}
                  >
                    EMA
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      fontSize: { xs: '0.6rem', sm: '0.72rem' },
                      fontWeight: 500,
                      color: 'text.primary',
                      ml: 0.5,
                    }}
                  >
                    {formatRate(emaRate)}
                    <Box
                      component="span"
                      sx={{
                        color: 'text.secondary',
                        ml: 0.25,
                        fontWeight: 400,
                      }}
                    >
                      SOL
                    </Box>
                  </Box>
                </>
              )}
            </CrownDirectionSegment>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default RatesTicker;
