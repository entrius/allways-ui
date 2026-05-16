import React, { useCallback, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useScoreFactorsWindow, type Direction } from '../../api';
import { FONTS } from '../../theme';
import CrownHistoryGrid from './CrownHistoryGrid';
import ScoreFactorsStrip from './ScoreFactorsStrip';

type CrownRange = '1h' | '2h' | '4h';

const CrownHistoryPanel: React.FC<{
  hotkey: string;
  lockedUid: number | null;
  direction: Direction;
  onDirectionChange: (d: Direction) => void;
  range: CrownRange;
  onRangeChange: (r: CrownRange) => void;
  pan: number;
  onPanChange: (next: number) => void;
  customFrom: number | null;
  customTo: number | null;
  onCustomRangeChange: (from: number | null, to: number | null) => void;
}> = ({
  hotkey,
  lockedUid,
  direction,
  onDirectionChange,
  range,
  onRangeChange,
  pan,
  onPanChange,
  customFrom,
  customTo,
  onCustomRangeChange,
}) => {
  // Grid owns lo/hi math (snap, pan, custom range) and reports the resolved
  // window so we can fetch factors that match what's drawn above.
  const [window, setWindow] = useState<{ lo: number; hi: number } | null>(null);
  const onWindowChange = useCallback((lo: number, hi: number) => {
    setWindow((prev) =>
      prev && prev.lo === lo && prev.hi === hi ? prev : { lo, hi },
    );
  }, []);

  const { data: windowFactors } = useScoreFactorsWindow(
    hotkey,
    direction,
    window?.lo,
    window?.hi,
  );
  const noCrown = windowFactors != null && windowFactors.crownShareWindow <= 0;

  return (
    <Box
      sx={{
        backgroundColor: 'surface.light',
        border: '1px solid',
        borderColor: 'divider',
        p: { xs: 2, md: 3 },
        mb: 3,
      }}
    >
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        sx={{ mb: 2.5 }}
      >
        <Stack direction="row" alignItems="baseline" spacing={1.5}>
          <Typography
            variant="monoSmall"
            sx={{
              fontSize: '0.7rem',
              letterSpacing: '0.22em',
              color: 'text.secondary',
            }}
          >
            Crown History
          </Typography>
          <Typography
            variant="mono"
            sx={{ fontSize: '0.65rem', color: 'text.disabled' }}
          >
            · scoring factors for window
          </Typography>
        </Stack>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.6rem',
            color: 'text.disabled',
          }}
        >
          pool × crown × cap × vol × rate³ × ramp
        </Typography>
      </Stack>

      <CrownHistoryGrid
        direction={direction}
        onDirectionChange={onDirectionChange}
        range={range}
        onRangeChange={onRangeChange}
        pan={pan}
        onPanChange={onPanChange}
        lockedUid={lockedUid}
        customFrom={customFrom}
        customTo={customTo}
        onCustomRangeChange={onCustomRangeChange}
        embedded
        onWindowChange={onWindowChange}
      />

      <Box
        sx={{
          mt: 3,
          mb: noCrown ? 1.5 : 2.5,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      />

      {noCrown && (
        <Typography
          variant="mono"
          sx={{
            mb: 1.5,
            px: 0.5,
            fontSize: '0.7rem',
            color: 'text.secondary',
            letterSpacing: '0.04em',
          }}
        >
          no crown share — factors below don't contribute to score
        </Typography>
      )}

      <ScoreFactorsStrip
        scoreFactors={windowFactors}
        windowCrownShare={windowFactors?.crownShareWindow}
      />
    </Box>
  );
};

export default CrownHistoryPanel;
