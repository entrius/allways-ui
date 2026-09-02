import React from 'react';
import { Box, Tooltip, alpha, useTheme } from '@mui/material';
import { FONTS } from '../../theme';
import { MOVE_COLORS } from '../dashboard/AllwaysMarketRate';

export type EligibilityState = 'eligible' | 'ineligible' | 'none';

const shortTime = (unixSecs: number): string =>
  new Date(unixSecs * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

// The strike-gate verdict chip. `live` marks a mid-round tip reading (~forward-step
// fresh); otherwise the verdict is the last flushed round's and gets an "as of" stamp,
// since on-chain strikes land immediately but rounds only flush hourly.
const EligibilityChip: React.FC<{
  state: EligibilityState;
  live?: boolean;
  asOf?: number | null;
}> = ({ state, live = false, asOf = null }) => {
  const theme = useTheme();
  // The app's shared semantic green (markets movers, terminal swap statuses),
  // not MUI's default success shade.
  const up = MOVE_COLORS[theme.palette.mode].up;
  const styles =
    state === 'eligible'
      ? {
          color: up,
          borderColor: alpha(up, 0.4),
          backgroundColor: alpha(up, 0.08),
        }
      : {
          color: 'text.disabled',
          borderColor: 'divider',
          backgroundColor: 'action.hover',
        };
  const label =
    state === 'eligible'
      ? '✓ eligible'
      : state === 'ineligible'
        ? '✗ not eligible'
        : 'no scored rounds yet';
  const stale = !live && asOf != null && state !== 'none';
  const tooltip =
    state === 'none'
      ? 'no validator score rows yet for this miner'
      : live
        ? 'live validator verdict (mid-round scoring tip)'
        : `last scored round${asOf != null ? ` (${shortTime(asOf)})` : ''} — rounds flush hourly, so an on-chain strike can precede the flip here by up to a round`;
  return (
    <Tooltip title={tooltip} placement="top">
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.6,
          px: 1,
          py: 0.4,
          border: '1px solid',
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
          ...styles,
        }}
      >
        {label}
        {stale && (
          <Box component="span" sx={{ color: 'text.disabled' }}>
            · as of {shortTime(asOf)}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};

export default EligibilityChip;
