import React, { useState, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Stack,
  Typography,
  LinearProgress,
  TextField,
  useTheme,
} from '@mui/material';
import { useAllSwaps } from '../../api';
import { FONTS } from '../../theme';
import CopyableAddress from '../CopyableAddress';
import { SwapTrackerSkeleton } from './Skeletons';
import { formatAmount } from '../../utils/format';

const PAGE_SIZE = 10;

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

const useDebounce = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

const SwapTracker: React.FC = () => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const debouncedSearch = useDebounce(search, 300);

  const { data: swaps, isLoading } = useAllSwaps({
    search: debouncedSearch || undefined,
    limit,
  });

  const handleLoadMore = useCallback(() => {
    setLimit((prev) => prev + PAGE_SIZE);
  }, []);

  // Reset limit when search changes
  React.useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [debouncedSearch]);

  const hasMore = swaps?.length === limit;

  return isLoading && !swaps ? (
    <SwapTrackerSkeleton />
  ) : (
    <Box>
      <Typography
        variant="h6"
        sx={{ mb: 1.5, fontFamily: FONTS.heading, fontWeight: 700 }}
      >
        Swaps
      </Typography>

      <TextField
        size="small"
        placeholder="Search by swap ID or address..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
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

      {!swaps?.length ? (
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
            {search ? 'No matching swaps' : 'No swaps yet'}
          </Typography>
        </Box>
      ) : (
        <>
          <Stack spacing={1.5}>
            {swaps.map((swap) => {
              const color = getStatusColor(swap.status, theme.palette);
              const progress = STATUS_PROGRESS[swap.status] || 0;
              return (
                <Box
                  key={swap.swapId}
                  component={RouterLink}
                  to={`/swap/${swap.swapId}`}
                  sx={{
                    p: 2,
                    borderRadius: 0,
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                    transition: 'border-color 0.2s',
                    '&:hover': { borderColor: theme.palette.border.light },
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
                        {swap.status.replace('_', ' ')}
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
                        onClick={(e: React.MouseEvent) => e.preventDefault()}
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
                        onClick={(e: React.MouseEvent) => e.preventDefault()}
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
          {hasMore && (
            <Button
              onClick={handleLoadMore}
              fullWidth
              sx={{
                mt: 1.5,
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                borderRadius: 0,
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  borderColor: theme.palette.border.light,
                },
              }}
            >
              Load more
            </Button>
          )}
        </>
      )}
    </Box>
  );
};

export default SwapTracker;
