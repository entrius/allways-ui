import React from 'react';
import { Box, Chip, Stack, Typography, useTheme } from '@mui/material';
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
    VoteCast: palette.status.vote,
    MinerActivated: palette.status.minerActivated,
  };
  return map[eventType] ?? palette.status.active;
};

const EventFeed: React.FC = () => {
  const theme = useTheme();
  const { data: events, isLoading } = useLatestEvents();

  return isLoading || !events ? (
    <EventFeedSkeleton />
  ) : (
    <Box>
      <Typography
        variant="h6"
        sx={{ mb: 2, fontFamily: FONTS.heading, fontWeight: 700 }}
      >
        Live Events
      </Typography>
      <Box
        sx={{
          maxHeight: 500,
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
              <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                {event.swapId && (
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                    }}
                  >
                    Swap #{event.swapId}
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
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};

export default EventFeed;
