import React from 'react';
import {
  Box,
  Stack,
  Typography,
  LinearProgress,
  useTheme,
} from '@mui/material';
import { useActiveSwaps } from '../../api';
import { FONTS } from '../../theme';

const STATUS_PROGRESS: Record<string, number> = {
  ACTIVE: 33,
  FULFILLED: 66,
  COMPLETED: 100,
  TIMED_OUT: 100,
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#3b82f6',
  FULFILLED: '#f59e0b',
  COMPLETED: '#10b981',
  TIMED_OUT: '#ef4444',
};

const shortAddr = (addr: string) =>
  addr.length > 10 ? `${addr.slice(0, 4)}..${addr.slice(-3)}` : addr;

const SwapTracker: React.FC = () => {
  const theme = useTheme();
  const { data: swaps = [] } = useActiveSwaps();

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{ mb: 2, fontFamily: FONTS.heading, fontWeight: 700 }}
      >
        Active Swaps
      </Typography>
      {swaps.length === 0 ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 0,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            sx={{
              color: 'text.secondary',
              fontFamily: FONTS.mono,
              fontSize: '0.8rem',
            }}
          >
            No active swaps
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {swaps.map((swap) => {
            const color =
              STATUS_COLORS[swap.status] || theme.palette.border.light;
            const progress = STATUS_PROGRESS[swap.status] || 0;
            return (
              <Box
                key={swap.swapId}
                sx={{
                  p: 2,
                  borderRadius: 0,
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'text.primary',
                    }}
                  >
                    Swap #{swap.swapId}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.65rem',
                      color,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    {swap.status}
                  </Typography>
                </Stack>

                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    mt: 1,
                    mb: 1.5,
                    height: 3,
                    borderRadius: 0,
                    backgroundColor: theme.palette.border.light,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: color,
                      borderRadius: 0,
                    },
                  }}
                />

                <Stack direction="row" spacing={2} flexWrap="wrap">
                  {swap.userAddress && (
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.7rem',
                        color: 'text.secondary',
                      }}
                    >
                      User: {shortAddr(swap.userAddress)}
                    </Typography>
                  )}
                  {swap.minerHotkey && (
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.7rem',
                        color: 'text.secondary',
                      }}
                    >
                      Miner: {shortAddr(swap.minerHotkey)}
                    </Typography>
                  )}
                  {swap.taoAmount && (
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.7rem',
                        color: 'primary.main',
                      }}
                    >
                      {parseFloat(swap.taoAmount).toFixed(4)} TAO
                    </Typography>
                  )}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default SwapTracker;
