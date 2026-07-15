import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import {
  directionalRateFor,
  rateUnitFor,
  type CurrentCrown,
  type Direction,
} from '../../api/models/MinersDashboard';
import { formatRate } from '../../utils/format';
import CrownIcon from './CrownIcon';

// One eyebrow segment: "👑 sol → btc  uid 2 @ 0.0021 BTC/SOL". Shared by the miners
// page (StickyNetworkHeader) and the dashboard (RatesTicker), which previously
// carried byte-identical copies of this markup — so a rate-formatting fix in one
// silently skipped the other.
//
// The two callers differ only in the no-holder wording and an optional trailing
// slot (the dashboard appends its EMA rate), so both are props.

const SEGMENT_FONT = { xs: '0.6rem', sm: '0.72rem' } as const;

const CrownDirectionSegment: React.FC<{
  direction: Direction;
  holder: CurrentCrown | null | undefined;
  /** Wording when no miner holds this direction's crown. */
  emptyLabel: string;
  /** Trailing content rendered after the rate (the dashboard's EMA suffix). */
  children?: React.ReactNode;
}> = ({ direction, holder, emptyLabel, children }) => {
  const [from, to] = direction.split('-');

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{ color: 'text.secondary' }}
    >
      <CrownIcon />
      <Typography variant="mono" sx={{ fontSize: SEGMENT_FONT }}>
        {from}
        <Box component="span" sx={{ mx: 0.5, color: 'text.disabled' }}>
          →
        </Box>
        {to}
      </Typography>
      {holder?.uid != null ? (
        <Typography
          variant="mono"
          sx={{
            fontSize: SEGMENT_FONT,
            color: 'text.primary',
            ml: 0.5,
            fontWeight: 500,
          }}
        >
          uid {holder.uid}
          {/* Directional "to per 1 from" via directionalRateFor. Significant
              figures, not 2dp: SOL→BTC quotes ~0.0021 BTC/SOL, which
              toFixed(2) renders as a flat "0.00". */}
          {holder.rate != null && (
            <>
              {' '}
              @ {formatRate(
                directionalRateFor(direction, holder.rate) ?? 0,
              )}{' '}
              {rateUnitFor(direction)}
            </>
          )}
        </Typography>
      ) : (
        <Typography
          variant="mono"
          sx={{ fontSize: SEGMENT_FONT, color: 'text.disabled', ml: 0.5 }}
        >
          {emptyLabel}
        </Typography>
      )}
      {children}
    </Stack>
  );
};

export default CrownDirectionSegment;
