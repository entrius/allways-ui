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

// The market-rate chart for a single trade direction. The toggle also drives the
// page's shared direction (and thus the Active Rates table filter), so the
// parent owns the value and mirrors it onto the URL.
const AllwaysMarketRate: React.FC<{
  direction: Direction;
  onDirectionChange: (direction: Direction) => void;
}> = ({ direction, onDirectionChange }) => {
  const theme = useTheme();

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
          value={direction}
          onChange={(_, v) => {
            if (!v) return;
            onDirectionChange(v as Direction);
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
        </ToggleButtonGroup>
      </Box>

      <Box
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <MarketRateChart key={direction} directions={[direction]} fill />
      </Box>
    </Box>
  );
};

export default AllwaysMarketRate;
