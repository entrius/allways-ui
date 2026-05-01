import React, { useEffect, useRef, useState } from 'react';
import { Box, Stack, keyframes, useTheme } from '@mui/material';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { useChainState } from '../api';
import { FONTS } from '../theme';
import { RollingValue } from './animated';

const BlockIndicator: React.FC = () => {
  const theme = useTheme();
  const { data: chainState } = useChainState();
  const currentBlock = chainState?.currentBlock;
  const [tick, setTick] = useState(0);
  const prevRef = useRef<number | undefined>(currentBlock);

  useEffect(() => {
    if (
      currentBlock !== undefined &&
      prevRef.current !== undefined &&
      currentBlock > prevRef.current
    ) {
      setTick((t) => t + 1);
    }
    prevRef.current = currentBlock;
  }, [currentBlock]);

  const display = currentBlock ? currentBlock.toLocaleString() : null;

  const flash = keyframes`
    0%   { transform: scale(1); color: ${theme.palette.text.secondary}; }
    40%  { transform: scale(1.25); color: ${theme.palette.primary.main}; }
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
      <ViewInArIcon
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
        Block #{display ? <RollingValue value={display} /> : '—'}
      </Box>
    </Stack>
  );
};

export default BlockIndicator;
