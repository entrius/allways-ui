import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { BlockIndicator } from '../index';
import { useCurrentCrown, useHaltState } from '../../api';
import CrownIcon from './CrownIcon';
import { FONTS } from '../../theme';

const StickyNetworkHeader: React.FC = () => {
  const { data: crown } = useCurrentCrown();
  const { data: halt } = useHaltState();

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
          <Typography variant="mono" sx={{ fontSize: '0.72rem' }}>
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
                fontSize: '0.72rem',
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
              sx={{ fontSize: '0.72rem', color: 'text.disabled', ml: 0.5 }}
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
        direction="row"
        spacing={3}
        alignItems="center"
        sx={{
          maxWidth: 1400,
          mx: 'auto',
          fontFamily: FONTS.mono,
          fontSize: '0.72rem',
          color: 'text.secondary',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <BlockIndicator />
        <Stack direction="row" spacing={3} alignItems="center" sx={{ flex: 1 }}>
          {segments}
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: halted ? 'error.main' : 'status.active',
            }}
          />
          <Typography variant="mono" sx={{ fontSize: '0.72rem' }}>
            {halted ? 'halted' : 'healthy'}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
};

export default StickyNetworkHeader;
