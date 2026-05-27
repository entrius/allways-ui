import React from 'react';
import { Box, Typography } from '@mui/material';
import { useHaltState } from '../../api';
import { FONTS } from '../../theme';

// Full-width red banner that mounts above every page when the swap
// contract is halted. The StickyNetworkHeader does carry a tiny
// "halted" dot, but during a halt no miner earns crown and the full
// emission pool recycles — that's significant enough to warrant
// something unmissable. Renders nothing when not halted.
const HaltBanner: React.FC = () => {
  const { data: halt } = useHaltState();
  if (!halt?.halted) return null;

  return (
    <Box
      role="alert"
      sx={{
        width: '100%',
        backgroundColor: 'error.main',
        color: 'error.contrastText',
        py: 1,
        px: { xs: 2, md: 4 },
        borderBottom: '1px solid',
        borderColor: 'error.dark',
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
        SWAP CONTRACT HALTED — emissions are recycling, no miner is currently
        earning. Rate posts still accepted; scoring resumes on unhalt.
        {halt.asOfBlock != null && (
          <Box component="span" sx={{ ml: 1, fontWeight: 400, opacity: 0.85 }}>
            (as of block #{halt.asOfBlock.toLocaleString()})
          </Box>
        )}
      </Typography>
    </Box>
  );
};

export default HaltBanner;
