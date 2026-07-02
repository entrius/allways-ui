import React, { useState } from 'react';
import {
  Box,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { Direction } from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import MarketRateChart from './MarketRateChart';

// The chart's view: a single trade direction, or BOTH overlaid on one chart.
type View = Direction | 'BOTH';

// The market-rate chart for a single direction (with a toggle that also drives
// the page's shared direction, controlled by the parent), plus a BOTH view that
// overlays both directions on one shared-axis chart. BOTH leaves the page
// direction — and thus the Active Rates table filter — on its last value.
const AllwaysMarketRate: React.FC<{
  direction: Direction;
  onDirectionChange: (d: Direction) => void;
}> = ({ direction, onDirectionChange }) => {
  const theme = useTheme();
  const [showBoth, setShowBoth] = useState(false);
  const view: View = showBoth ? 'BOTH' : direction;

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          flexWrap: 'wrap',
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            EMA
          </Typography>
          <Tooltip
            title={
              <Box sx={{ maxWidth: 280 }}>
                Executed rate of recently completed swaps (points) with an EMA
                (line) over the most recent window, plus a dashed line at the
                live crown rate. X-axis is time, y-axis is rate in SOL.
              </Box>
            }
            arrow
            placement="right"
          >
            <IconButton size="small" sx={{ p: 0, color: 'text.secondary' }}>
              <InfoOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, v) => {
            if (!v) return;
            if (v === 'BOTH') {
              setShowBoth(true);
            } else {
              setShowBoth(false);
              onDirectionChange(v as Direction);
            }
          }}
          sx={{
            '& .MuiToggleButton-root': {
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              px: 1.25,
              py: 0.5,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderRadius: 0,
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.secondary,
            },
            '& .Mui-selected': {
              backgroundColor: `${theme.palette.primary.main}22 !important`,
              color: `${theme.palette.primary.main} !important`,
              borderColor: `${theme.palette.primary.main} !important`,
            },
            '& .Mui-selected + .MuiToggleButton-root': {
              borderLeftColor: `${theme.palette.primary.main} !important`,
            },
          }}
        >
          <ToggleButton value="BTC-TAO">BTC {'→'} TAO</ToggleButton>
          <ToggleButton value="TAO-BTC">TAO {'→'} BTC</ToggleButton>
          <ToggleButton value="BOTH">BOTH</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <MarketRateChart
          key={view}
          directions={view === 'BOTH' ? ['BTC-TAO', 'TAO-BTC'] : [view]}
          fill
        />
      </Box>
    </Box>
  );
};

export default AllwaysMarketRate;
