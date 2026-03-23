import React from 'react';
import { Box, Chip, Stack, Typography, useTheme } from '@mui/material';
import { useLatestEvents } from '../../api';
import { FONTS } from '../../theme';

const EVENT_COLORS: Record<string, string> = {
  SwapInitiated: '#3b82f6',
  SwapFulfilled: '#f59e0b',
  SwapCompleted: '#10b981',
  SwapTimedOut: '#ef4444',
  CollateralPosted: '#8b5cf6',
  CollateralWithdrawn: '#8b5cf6',
  VoteCast: '#6366f1',
  MinerActivated: '#14b8a6',
};

const shortAddr = (addr: string) =>
  addr.length > 10 ? `${addr.slice(0, 4)}..${addr.slice(-3)}` : addr;

const EventFeed: React.FC = () => {
  const theme = useTheme();
  const { data: events = [] } = useLatestEvents();

  return (
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
          {events.map((event) => (
            <Box
              key={event.id}
              sx={{
                p: 1.5,
                borderRadius: 0,
                backgroundColor: 'background.paper',
                border: `1px solid`,
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
                      EVENT_COLORS[event.eventType] ||
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
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                    }}
                  >
                    {shortAddr(event.minerHotkey)}
                  </Typography>
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
