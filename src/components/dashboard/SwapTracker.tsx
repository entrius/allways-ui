import React, { useState, useCallback, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useAllSwaps, useMiners, useSwapDetail } from '../../api';
import { FONTS } from '../../theme';
import { SwapTrackerSkeleton } from './Skeletons';
import { formatAmount } from '../../utils/format';

const PAGE_SIZE = 25;

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
  // Terminal states pop with semantic color — completion green / timeout red.
  // In-flight states keep their muted blue tints.
  const map: Record<string, string> = {
    ACTIVE: palette.status.active,
    FULFILLED: palette.status.fulfilled,
    COMPLETED: 'var(--color-success)',
    TIMED_OUT: 'var(--color-danger)',
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

const SwapTracker: React.FC<{ embedded?: boolean }> = ({ embedded }) => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const debouncedSearch = useDebounce(search, 300);

  const idMatch = debouncedSearch.trim().match(/^#?(\d+)$/);
  const exactSwapId = idMatch?.[1] ?? '';

  const { data: detail, isLoading: detailLoading } = useSwapDetail(exactSwapId);
  const { data: fuzzy, isLoading: fuzzyLoading } = useAllSwaps(
    { search: debouncedSearch || undefined, limit },
    !exactSwapId,
  );
  const { data: miners } = useMiners();
  const minerUid = (hotkey: string | null): number | undefined =>
    hotkey ? miners?.find((m) => m.hotkey === hotkey)?.uid : undefined;

  const swaps = exactSwapId ? (detail?.swap ? [detail.swap] : []) : fuzzy;
  const isLoading = exactSwapId ? detailLoading : fuzzyLoading;

  // Reset limit when search changes
  React.useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [debouncedSearch]);

  const hasMore = !exactSwapId && swaps?.length === limit;
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setLimit((prev) => prev + PAGE_SIZE);
    }
  }, [hasMore]);

  return isLoading && !swaps ? (
    <SwapTrackerSkeleton />
  ) : (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {!embedded && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography
            variant="h6"
            sx={{ fontFamily: FONTS.heading, fontWeight: 700 }}
          >
            Transactions
          </Typography>
          <Tooltip
            title={
              <Box sx={{ maxWidth: 280 }}>
                Every transaction on the network in chronological order, with
                its current status and progress through the lifecycle: Initiated
                → Fulfilled → Completed (or Timed Out). Click a row to see the
                full timeline.
              </Box>
            }
            arrow
            placement="right"
          >
            <IconButton size="small" sx={{ p: 0, color: 'text.secondary' }}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <TextField
        size="small"
        placeholder="Search by transaction ID (#N) or address..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 1.5,
          width: '100%',
          '& .MuiOutlinedInput-root': {
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color: 'text.primary',
            borderRadius: 0,
            height: 32,
            '& fieldset': { borderColor: 'divider' },
            '&:hover fieldset': { borderColor: theme.palette.border.light },
            '&.Mui-focused fieldset': { borderColor: 'primary.main' },
          },
        }}
      />

      {!swaps?.length ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 0,
            backgroundColor: 'surface.light',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            sx={{
              color: 'text.secondary',
              fontFamily: FONTS.mono,
              fontSize: { xs: '0.72rem', sm: '0.8rem' },
            }}
          >
            {search ? 'No matching transactions' : 'No transactions yet'}
          </Typography>
        </Box>
      ) : (
        <Box
          ref={scrollRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.border.light,
              borderRadius: 0,
            },
          }}
        >
          <Stack spacing={0}>
            {swaps.map((swap) => {
              const color = getStatusColor(swap.status, theme.palette);
              const progress = STATUS_PROGRESS[swap.status] || 0;
              const sentLine =
                swap.sourceAmount && swap.sourceChain
                  ? formatAmount(swap.sourceAmount, swap.sourceChain)
                  : swap.taoAmount
                    ? `${parseFloat(swap.taoAmount).toFixed(4)} TAO`
                    : null;
              const recvLine =
                swap.destAmount && swap.destChain
                  ? formatAmount(swap.destAmount, swap.destChain)
                  : null;
              const uid = minerUid(swap.minerHotkey);
              return (
                <Box
                  key={swap.swapId}
                  component={RouterLink}
                  to={`/swap/${swap.swapId}`}
                  sx={{
                    px: 1,
                    py: { xs: 1.75, sm: 1.25 },
                    borderRadius: 0,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="baseline"
                    spacing={1}
                  >
                    {/* The amount conversion is the headline. */}
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: { xs: '0.72rem', sm: '0.8rem' },
                        fontWeight: 600,
                        color: 'text.primary',
                      }}
                    >
                      {sentLine ?? `#${swap.swapId}`}
                      {sentLine && recvLine && (
                        <>
                          <Box
                            component="span"
                            sx={{
                              color: 'text.secondary',
                              mx: 0.5,
                              fontWeight: 400,
                            }}
                          >
                            →
                          </Box>
                          {recvLine}
                        </>
                      )}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: { xs: '0.58rem', sm: '0.65rem' },
                        color,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {swap.status.replace('_', ' ')}
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      mt: 0.75,
                      mb: 0.75,
                      height: 2,
                      borderRadius: 0,
                      backgroundColor: theme.palette.border.light,
                      '& .MuiLinearProgress-bar': {
                        // Bar fill stays neutral regardless of status;
                        // status text carries the green/red signal.
                        backgroundColor: theme.palette.border.medium,
                        borderRadius: 0,
                      },
                    }}
                  />

                  {/* Tx id + miner uid, de-emphasized. */}
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: { xs: '0.58rem', sm: '0.65rem' },
                      color: 'text.secondary',
                    }}
                  >
                    #{swap.swapId}
                    {uid != null && ` · uid ${uid}`}
                  </Typography>
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
