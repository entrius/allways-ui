import React from 'react';
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
import {
  ALL_DIRECTIONS,
  directionLabel,
  type Direction,
} from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import MarketRateChart from './MarketRateChart';

// The chart's view: a single trade direction, or BOTH — the two forward
// SOL→spoke legs overlaid on one shared price axis. Only the forward legs
// overlay: a leg and its reverse are quoted in different units (BTC-per-SOL vs
// SOL-per-BTC), so they can't share a price scale.
export type MarketRateView = Direction | 'BOTH';
const BOTH_DIRECTIONS: Direction[] = ['SOL-BTC', 'SOL-TAO'];

// The market-rate chart for a single direction (with a toggle that also drives
// the page's shared direction), plus a BOTH view that overlays both directions
// on one shared-axis chart. BOTH leaves the page direction — and thus the Active
// Rates table filter — on its last value.
//
// Fully controlled: the parent owns both `direction` and `showBoth` so it can
// mirror them onto the URL. `view` is derived, never stored.
const AllwaysMarketRate: React.FC<{
  direction: Direction;
  showBoth: boolean;
  onViewChange: (view: MarketRateView) => void;
}> = ({ direction, showBoth, onViewChange }) => {
  const theme = useTheme();
  const view: MarketRateView = showBoth ? 'BOTH' : direction;

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
            onViewChange(v as MarketRateView);
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
          {ALL_DIRECTIONS.map((d) => (
            <ToggleButton key={d} value={d}>
              {directionLabel(d)}
            </ToggleButton>
          ))}
          <ToggleButton value="BOTH">BOTH</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <MarketRateChart
          key={view}
          directions={view === 'BOTH' ? BOTH_DIRECTIONS : [view]}
          fill
        />
      </Box>
    </Box>
  );
};

export default AllwaysMarketRate;
