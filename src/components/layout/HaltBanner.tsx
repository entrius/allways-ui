import React from 'react';
import { Box, Typography } from '@mui/material';
import { useHaltState } from '../../api';
import { FONTS } from '../../theme';
import { formatTimeAgo } from '../../utils/format';

// Full-width red banner that mounts above every page when the swap
// contract is halted. During a halt no miner earns crown and the full
// emission pool recycles — significant enough to warrant something
// unmissable. Renders nothing when not halted.
const HaltBanner: React.FC = () => {
  const { data: halt } = useHaltState();
  if (!halt?.halted) return null;

  return (
    <Box
      role="alert"
      sx={{
        width: '100%',
        backgroundColor: 'warning.main',
        color: 'warning.contrastText',
        py: 1,
        px: { xs: 2, md: 4 },
        borderBottom: '1px solid',
        borderColor: 'warning.dark',
      }}
    >
      <Typography
        variant="mono"
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.78rem',
          letterSpacing: '0.04em',
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        System is paused for maintenance. Swaps are not being initiated.
        Emissions are recycling. Scoring will resume when the system is
        unpaused.
        {halt.asOf != null && (
          <Box component="span" sx={{ ml: 1, fontWeight: 400, opacity: 0.85 }}>
            (as of {formatTimeAgo(halt.asOf)})
          </Box>
        )}
      </Typography>
    </Box>
  );
};

export default HaltBanner;
