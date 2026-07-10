import React, { useEffect, useRef, useState } from 'react';
import { Box, Stack, keyframes, useTheme } from '@mui/material';
import UpdateIcon from '@mui/icons-material/Update';
import { useChainState } from '../api';
import { FONTS } from '../theme';
import { formatTimeAgo } from '../utils/format';

// The chain head is time-native: `asOf` is the unix-seconds timestamp of the
// most recent contract event. This renders a live "updated <ago>" indicator,
// flashing whenever the head advances.
const BlockIndicator: React.FC = () => {
  const theme = useTheme();
  const { data: chainState } = useChainState();
  const asOf = chainState?.asOf;
  const [tick, setTick] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const prevRef = useRef<number | undefined>(asOf);

  useEffect(() => {
    if (
      asOf !== undefined &&
      prevRef.current !== undefined &&
      asOf > prevRef.current
    ) {
      setTick((t) => t + 1);
    }
    prevRef.current = asOf;
  }, [asOf]);

  // Re-render each second so the relative time stays live between head updates.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const display = asOf ? formatTimeAgo(asOf, nowMs) : null;

  const flash = keyframes`
    0%   { transform: scale(1); color: ${theme.palette.text.secondary}; }
    40%  { transform: scale(1.25); color: ${theme.palette.text.primary}; }
    100% { transform: scale(1); color: ${theme.palette.text.secondary}; }
  `;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.75}
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        color: 'text.secondary',
      }}
    >
      <UpdateIcon
        key={tick}
        sx={{
          fontSize: 14,
          color: 'text.secondary',
          transformOrigin: 'center',
          animation: tick > 0 ? `${flash} 0.6s ease-out` : 'none',
        }}
      />
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          letterSpacing: '0.04em',
          color: 'text.secondary',
        }}
      >
        {/* "last event", not "updated": the timestamp is the most recent
            on-chain event, not this page's refresh — "updated 6h ago" read as
            a stale dashboard when the network was merely quiet. */}
        last event {display ?? '—'}
      </Box>
    </Stack>
  );
};

export default BlockIndicator;
