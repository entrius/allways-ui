import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { BlockIndicator } from '../index';
import { useCurrentCrown, useHaltState, useScoringState } from '../../api';
import CrownIcon from './CrownIcon';
import { FONTS } from '../../theme';

// Live "time since the validator last flushed crown/rate data". The validator
// advances the scoring-state watermark only on a real flush (~every scoring
// window), so this counts up from that timestamp until the next flush snaps
// it back. Block-aligned math was wrong here: the flush is gated on the
// validator's forward-step counter, not on absolute block height.
const formatAgo = (updatedAtMs: number, nowMs: number): string => {
  const totalMin = Math.floor(Math.max(0, nowMs - updatedAtMs) / 60_000);
  if (totalMin < 1) return 'just now';
  if (totalMin < 60) return `~${totalMin}m ago`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `~${h}h ${m}m ago` : `~${h}h ago`;
};

const RefreshIndicator: React.FC<{ block: number; updatedAt: string }> = ({
  block,
  updatedAt,
}) => {
  const updatedAtMs = React.useMemo(
    () => new Date(updatedAt).getTime(),
    [updatedAt],
  );
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Typography
      variant="mono"
      sx={{
        fontSize: { xs: '0.6rem', sm: '0.72rem' },
        color: 'text.secondary',
      }}
    >
      last refresh #{block.toLocaleString()}
      <Box component="span" sx={{ mx: 0.5, color: 'text.disabled' }}>
        ·
      </Box>
      {formatAgo(updatedAtMs, nowMs)}
    </Typography>
  );
};

const StickyNetworkHeader: React.FC = () => {
  const { data: crown } = useCurrentCrown();
  const { data: halt } = useHaltState();
  const { data: scoring } = useScoringState();

  const segments: React.ReactNode[] = [];
  if (crown) {
    for (const dir of ['BTC-TAO', 'TAO-BTC'] as const) {
      const h = crown[dir];
      if (!h) continue;
      const [from, to] = dir.split('-');
      segments.push(
        <Stack
          key={dir}
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ color: 'text.secondary' }}
        >
          <CrownIcon />
          <Typography
            variant="mono"
            sx={{ fontSize: { xs: '0.6rem', sm: '0.72rem' } }}
          >
            {from}
            <Box component="span" sx={{ mx: 0.5, color: 'text.disabled' }}>
              →
            </Box>
            {to}
          </Typography>
          {h.uid != null ? (
            <Typography
              variant="mono"
              sx={{
                fontSize: { xs: '0.6rem', sm: '0.72rem' },
                color: 'text.primary',
                ml: 0.5,
                fontWeight: 500,
              }}
            >
              uid {h.uid}
              {h.rate != null && <> @ {h.rate.toFixed(2)} τ</>}
            </Typography>
          ) : (
            <Typography
              variant="mono"
              sx={{
                fontSize: { xs: '0.6rem', sm: '0.72rem' },
                color: 'text.disabled',
                ml: 0.5,
              }}
            >
              none
            </Typography>
          )}
        </Stack>,
      );
    }
  }

  const halted = halt?.halted ?? false;

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backgroundColor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 1.5,
        px: { xs: 2, md: 4 },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 0.5, sm: 3 }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{
          maxWidth: 1400,
          mx: 'auto',
          fontFamily: FONTS.mono,
          fontSize: { xs: '0.6rem', sm: '0.72rem' },
          color: 'text.secondary',
          flexWrap: 'wrap',
          gap: { xs: 0.5, sm: 2 },
          rowGap: { xs: 0.5, sm: 1 },
        }}
      >
        <BlockIndicator />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 0.5, sm: 3 }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ flexWrap: 'wrap', gap: { xs: 0.5, sm: 3 }, flex: { sm: 1 } }}
        >
          {segments}
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: halted ? 'warning.main' : 'status.active',
            }}
          />
          {halted ? (
            <Typography
              variant="mono"
              sx={{
                fontSize: { xs: '0.6rem', sm: '0.72rem' },
                color: 'warning.main',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              paused
            </Typography>
          ) : scoring?.updatedAt != null && scoring.lastScoredBlock > 0 ? (
            <RefreshIndicator
              block={scoring.lastScoredBlock}
              updatedAt={scoring.updatedAt}
            />
          ) : (
            <Typography
              variant="mono"
              sx={{
                fontSize: { xs: '0.6rem', sm: '0.72rem' },
                color: 'text.secondary',
              }}
            >
              healthy
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default StickyNetworkHeader;
