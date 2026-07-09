import React, { useCallback, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useMinerScores, type Direction } from '../../api';
import { FONTS } from '../../theme';
import CrownHistoryGrid from './CrownHistoryGrid';
import ScoreBreakdown from './ScoreBreakdown';

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
  // window so we can fetch the score rounds that match what's drawn above.
  const [window, setWindow] = useState<{ lo: number; hi: number } | null>(null);
  const onWindowChange = useCallback((lo: number, hi: number) => {
    setWindow((prev) =>
      prev && prev.lo === lo && prev.hi === hi ? prev : { lo, hi },
    );
  }, []);

  const { data: windowRounds } = useMinerScores(
    hotkey,
    { direction, fromTs: window?.lo, toTs: window?.hi },
    window != null,
  );
  const rounds = windowRounds ?? [];

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
          eligible × [0.8·pool·crown·cap·fill + 0.2·pool·vol·quality]
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
          mb: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      />

      {rounds.length === 0 ? (
        <Typography
          variant="mono"
          sx={{
            px: 0.5,
            fontSize: '0.7rem',
            color: 'text.disabled',
            letterSpacing: '0.04em',
          }}
        >
          no scored rounds in this window
        </Typography>
      ) : (
        <Stack spacing={0.75} sx={{ px: 0.5 }}>
          {rounds.map((row) => (
            <ScoreBreakdown
              key={`${row.roundTs}-${row.fromChain}-${row.toChain}`}
              row={row}
              label={new Date(row.roundTs * 1000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default CrownHistoryPanel;
