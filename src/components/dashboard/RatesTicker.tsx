import React from 'react';
import { Stack } from '@mui/material';
import { useCurrentCrown } from '../../api';
import { ALL_DIRECTIONS } from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import { BlockIndicator } from '../index';
import Ticker from '../Ticker';
import CrownDirectionSegment from '../miners/CrownDirectionSegment';

const DIRECTIONS = ALL_DIRECTIONS;

// Mirrors the miners-page StickyNetworkHeader eyebrow — the "updated <ago>"
// indicator plus the current crown holder and its live directional rate per
// direction (uid N @ rate TO/FROM). No last-refresh / health segment.
const RatesTicker: React.FC = () => {
  const { data: crown } = useCurrentCrown();

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
      <Ticker>
        {DIRECTIONS.map((dir) => (
          <CrownDirectionSegment
            key={dir}
            direction={dir}
            holder={crown?.[dir]}
            emptyLabel="no crown"
          />
        ))}
      </Ticker>
    </Stack>
  );
};

export default RatesTicker;
