import React, { useState, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Stack,
  Typography,
  LinearProgress,
  TextField,
  useTheme,
} from '@mui/material';
import { useActiveSwaps } from '../../api';
import { FONTS } from '../../theme';
import CopyableAddress from '../CopyableAddress';
import { SwapTrackerSkeleton } from './Skeletons';
import { formatAmount } from '../../utils/format';

const STATUS_PROGRESS: Record<string, number> = {
  ACTIVE: 33,
  FULFILLED: 66,
  COMPLETED: 100,
  TIMED_OUT: 100,
};

const getStatusColor = (
  status: string,
  palette: {
    status: {
      active: string;
      fulfilled: string;
      completed: string;
      timedOut: string;
    };
  },
): string => {
  const map: Record<string, string> = {
    ACTIVE: palette.status.active,
    FULFILLED: palette.status.fulfilled,
    COMPLETED: palette.status.completed,
    TIMED_OUT: palette.status.timedOut,
  };
  return map[status] ?? palette.status.active;
};

const SwapTracker: React.FC = () => {
  const theme = useTheme();
  const { data: swaps, isLoading } = useActiveSwaps();
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!swaps || !filter) return swaps;
    const q = filter.toLowerCase();
    return swaps.filter(
      (s) =>
        s.swapId.includes(q) ||
        s.userAddress?.toLowerCase().includes(q) ||
        s.minerHotkey?.toLowerCase().includes(q),
    );
  }, [swaps, filter]);

  return isLoading || !swaps ? (
    <SwapTrackerSkeleton />
  ) : (
    <Box>
      <Typography
        variant="h6"
        sx={{ mb: 1.5, fontFamily: FONTS.heading, fontWeight: 700 }}
      >
        Active Swaps
      </Typography>

      {swaps.length > 0 && (
        <TextField
          size="small"
          placeholder="Filter by ID or address..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{
            mb: 1.5,
            width: '100%',
            '& .MuiInputBase-root': {
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              borderRadius: 0,
            },
          }}
        />
      )}

      {!filtered?.length ? (
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
            {filter ? 'No matching swaps' : 'No active swaps'}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {filtered?.map((swap) => {
            const color =
              getStatusColor(swap.status, theme.palette) ||
              theme.palette.border.light;
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
                    component={RouterLink}
                    to={`/swap/${swap.swapId}`}
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'text.primary',
                      textDecoration: 'none',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    Swap #{swap.swapId}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {swap.sourceChain && swap.destChain && (
                      <Typography
                        sx={{
                          fontFamily: FONTS.mono,
                          fontSize: '0.65rem',
                          color: 'text.secondary',
                        }}
                      >
                        {swap.sourceChain.toUpperCase()} &rarr;{' '}
                        {swap.destChain.toUpperCase()}
                      </Typography>
                    )}
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

                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  {swap.sourceAmount && swap.sourceChain && (
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.7rem',
                        color: 'primary.main',
                      }}
                    >
                      {formatAmount(swap.sourceAmount, swap.sourceChain)}
                    </Typography>
                  )}
                  {swap.taoAmount && !swap.sourceAmount && (
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
                  {swap.userAddress && (
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.7rem',
                        color: 'text.secondary',
                      }}
                    >
                      User: <CopyableAddress address={swap.userAddress} />
                    </Typography>
                  )}
                  {swap.minerHotkey && (
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.7rem',
                        color: 'text.secondary',
                      }}
                    >
                      Miner: <CopyableAddress address={swap.minerHotkey} />
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
