import React, { useRef, useState, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Chip, Stack, Typography, useTheme } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useLatestEvents } from '../../api';
import { FONTS } from '../../theme';
import CopyableAddress from '../CopyableAddress';
import { EventFeedSkeleton } from './Skeletons';

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
    CollateralSlashed: palette.status.timedOut,
    VoteCast: palette.status.vote,
    MinerActivated: palette.status.minerActivated,
    MinerReserved: palette.status.minerActivated,
    ReservationExtended: palette.status.minerActivated,
  };
  return map[eventType] ?? palette.status.active;
};

const EventFeed: React.FC = () => {
  const theme = useTheme();
  const { data: events, isLoading } = useLatestEvents();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) setScrolled(el.scrollTop > 100);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return isLoading || !events ? (
    <EventFeedSkeleton />
  ) : (
    <Box sx={{ position: 'relative' }}>
      <Typography
        variant="h6"
        sx={{ mb: 2, fontFamily: FONTS.heading, fontWeight: 700 }}
      >
        Live Events
      </Typography>
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          height: 480,
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
                  <CopyableAddress address={event.minerHotkey} chain="tao" />
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
      {scrolled && (
        <Button
          onClick={scrollToTop}
          size="small"
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            minWidth: 32,
            width: 32,
            height: 32,
            p: 0,
            borderRadius: 0,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'action.hover',
              color: 'primary.main',
            },
          }}
        >
          <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
        </Button>
      )}
    </Box>
  );
};

export default EventFeed;
