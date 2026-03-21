import React from 'react';
import { Box, Stack, Typography, LinearProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { COLORS, FONTS } from '../../theme';

interface ActiveSwap {
  swapId: string;
  status: string;
  userAddress: string | null;
  minerHotkey: string | null;
  taoAmount: string | null;
  sourceChain: string | null;
  destChain: string | null;
  initiatedAt: string | null;
  fulfilledAt: string | null;
  resolvedAt: string | null;
}

const STATUS_PROGRESS: Record<string, number> = {
  ACTIVE: 33,
  FULFILLED: 66,
  COMPLETED: 100,
  TIMED_OUT: 100,
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#3b82f6',
  FULFILLED: '#f59e0b',
  COMPLETED: COLORS.primary,
  TIMED_OUT: '#ef4444',
};

const shortAddr = (addr: string) =>
  addr.length > 10 ? `${addr.slice(0, 4)}..${addr.slice(-3)}` : addr;

const SwapTracker: React.FC = () => {
  const { data: swaps = [] } = useQuery<ActiveSwap[]>({
    queryKey: ['swaps', 'active'],
    queryFn: () => api.get('/swaps/active').then((r) => r.data),
    refetchInterval: 15000,
  });

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontFamily: FONTS.heading, fontWeight: 700 }}>
        Active Swaps
      </Typography>
      {swaps.length === 0 ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 1,
            backgroundColor: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <Typography sx={{ color: COLORS.textMuted, fontFamily: FONTS.mono, fontSize: '0.8rem' }}>
            No active swaps
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {swaps.map((swap) => {
            const color = STATUS_COLORS[swap.status] || COLORS.borderLight;
            const progress = STATUS_PROGRESS[swap.status] || 0;
            return (
              <Box
                key={swap.swapId}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  backgroundColor: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontFamily: FONTS.mono, fontSize: '0.8rem', fontWeight: 600, color: COLORS.white }}>
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
                    borderRadius: 2,
                    backgroundColor: COLORS.borderLight,
                    '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 2 },
                  }}
                />

                <Stack direction="row" spacing={2} flexWrap="wrap">
                  {swap.userAddress && (
                    <Typography sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem', color: COLORS.textSecondary }}>
                      User: {shortAddr(swap.userAddress)}
                    </Typography>
                  )}
                  {swap.minerHotkey && (
                    <Typography sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem', color: COLORS.textSecondary }}>
                      Miner: {shortAddr(swap.minerHotkey)}
                    </Typography>
                  )}
                  {swap.taoAmount && (
                    <Typography sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem', color: COLORS.primary }}>
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
