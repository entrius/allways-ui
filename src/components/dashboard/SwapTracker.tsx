import React, { useState, useCallback, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
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
import { formatAmount, getStatusColor } from '../../utils';
import {
  SWAP_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  PANEL_HEIGHT,
} from '../../constants';

const STATUS_PROGRESS: Record<string, number> = {
  ACTIVE: 33,
  FULFILLED: 66,
  COMPLETED: 100,
  TIMED_OUT: 100,
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
  const [limit, setLimit] = useState(SWAP_PAGE_SIZE);
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  const { data: swaps, isLoading } = useAllSwaps({
    search: debouncedSearch || undefined,
    limit,
  });

  // Reset limit when search changes
  React.useEffect(() => {
    setLimit(SWAP_PAGE_SIZE);
  }, [debouncedSearch]);

  const hasMore = swaps?.length === limit;
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setLimit((prev) => prev + SWAP_PAGE_SIZE);
    }
  }, [hasMore]);

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
        <Box
          ref={scrollRef}
          onScroll={handleScroll}
          sx={{
            height: PANEL_HEIGHT,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.border.light,
              borderRadius: 0,
            },
          }}
        >
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
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                    '&:hover': { borderColor: 'primary.main' },
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
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
        </Box>
      )}
    </Box>
  );
};

export default SwapTracker;
