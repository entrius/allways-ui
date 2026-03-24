import React, { useState, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Chip,
  Stack,
  Typography,
  TextField,
  useTheme,
} from '@mui/material';
import { useLatestEvents } from '../../api';
import { FONTS } from '../../theme';
import CopyableAddress from '../CopyableAddress';
import { EventFeedSkeleton } from './Skeletons';

const EVENT_TYPES = [
  'SwapInitiated',
  'SwapFulfilled',
  'SwapCompleted',
  'SwapTimedOut',
  'CollateralPosted',
  'VoteCast',
  'MinerReserved',
] as const;

const getEventColor = (
  eventType: string,
  palette: {
    status: {
      active: string;
      fulfilled: string;
      completed: string;
      timedOut: string;
      collateral: string;
      vote: string;
      minerActivated: string;
    };
  },
): string => {
  const map: Record<string, string> = {
    SwapInitiated: palette.status.active,
    SwapFulfilled: palette.status.fulfilled,
    SwapCompleted: palette.status.completed,
    SwapTimedOut: palette.status.timedOut,
    CollateralPosted: palette.status.collateral,
    CollateralWithdrawn: palette.status.collateral,
    VoteCast: palette.status.vote,
    MinerActivated: palette.status.minerActivated,
    MinerReserved: palette.status.minerActivated,
    ReservationExtended: palette.status.minerActivated,
  };
  return map[eventType] ?? palette.status.active;
};

const useDebounce = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

const EventFeed: React.FC = () => {
  const theme = useTheme();
  const [addressFilter, setAddressFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const debouncedAddress = useDebounce(addressFilter, 300);

  const filters = useMemo(() => {
    const f: Record<string, string | undefined> = {};
    if (typeFilter) f.eventType = typeFilter;
    if (debouncedAddress) {
      // Send as both params — API will match whichever column has data
      f.minerHotkey = debouncedAddress;
      f.userAddress = debouncedAddress;
    }
    return Object.keys(f).length ? f : undefined;
  }, [typeFilter, debouncedAddress]);

  const { data: events, isLoading } = useLatestEvents(filters);

  return isLoading || !events ? (
    <EventFeedSkeleton />
  ) : (
    <Box>
      <Typography
        variant="h6"
        sx={{ mb: 1.5, fontFamily: FONTS.heading, fontWeight: 700 }}
      >
        Live Events
      </Typography>

      {/* Filter bar */}
      <Stack spacing={1} sx={{ mb: 1.5 }}>
        <TextField
          size="small"
          placeholder="Filter by address..."
          value={addressFilter}
          onChange={(e) => setAddressFilter(e.target.value)}
          sx={{
            '& .MuiInputBase-root': {
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              borderRadius: 0,
            },
          }}
        />
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          <Chip
            label="All"
            size="small"
            variant={!typeFilter ? 'filled' : 'outlined'}
            onClick={() => setTypeFilter(undefined)}
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.6rem',
              height: 20,
              borderRadius: 0,
            }}
          />
          {EVENT_TYPES.map((t) => (
            <Chip
              key={t}
              label={t.replace('Swap', '').replace('Collateral', 'Coll.')}
              size="small"
              variant={typeFilter === t ? 'filled' : 'outlined'}
              onClick={() => setTypeFilter(typeFilter === t ? undefined : t)}
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.6rem',
                height: 20,
                borderRadius: 0,
                borderColor: getEventColor(t, theme.palette),
              }}
            />
          ))}
        </Stack>
      </Stack>

      <Box
        sx={{
          maxHeight: 400,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.border.light,
            borderRadius: 0,
          },
        }}
      >
        <Stack spacing={1}>
          {events?.map((event) => (
            <Box
              key={event.id}
              sx={{
                p: 1.5,
                borderRadius: 0,
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'border-color 0.2s',
                '&:hover': { borderColor: theme.palette.border.light },
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={1}
              >
                <Chip
                  label={event.eventType}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.65rem',
                    height: 22,
                    borderRadius: 0,
                    borderColor:
                      getEventColor(event.eventType, theme.palette) ||
                      theme.palette.border.light,
                    color: 'text.primary',
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.65rem',
                    color: 'text.secondary',
                  }}
                >
                  #{event.blockNumber}
                </Typography>
              </Stack>
              <Stack
                direction="row"
                spacing={2}
                sx={{ mt: 0.5 }}
                flexWrap="wrap"
                useFlexGap
              >
                {event.swapId && (
                  <Typography
                    component={RouterLink}
                    to={`/swap/${event.swapId}`}
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                      textDecoration: 'none',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    Swap #{event.swapId}
                  </Typography>
                )}
                {event.sourceChain && event.destChain && (
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                    }}
                  >
                    {event.sourceChain.toUpperCase()} &rarr;{' '}
                    {event.destChain.toUpperCase()}
                  </Typography>
                )}
                {event.minerHotkey && (
                  <CopyableAddress address={event.minerHotkey} />
                )}
                {event.taoAmount && (
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.7rem',
                      color: 'primary.main',
                    }}
                  >
                    {parseFloat(event.taoAmount).toFixed(4)} TAO
                  </Typography>
                )}
                {event.reservedUntil && (
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                    }}
                  >
                    until #{event.reservedUntil}
                  </Typography>
                )}
                {event.voteType && (
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                    }}
                  >
                    {event.voteType} ({event.voteCount})
                  </Typography>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};

export default EventFeed;
