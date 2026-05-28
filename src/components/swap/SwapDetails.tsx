import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { FONTS } from '../../theme';
import type { BestMinerResponse } from '../../api/SwapApiClient';
import { formatRate, shortAddr } from '../../utils/format';
import type { SwapFlowState } from '../../hooks/useSwapFlow';

interface Props {
  best?: BestMinerResponse;
  state: SwapFlowState;
}

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2}>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        color: 'text.secondary',
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.75rem',
        color: 'text.primary',
      }}
    >
      {value}
    </Typography>
  </Stack>
);

const SwapDetails: React.FC<Props> = ({ best, state }) => {
  if (!best && !state.reserve) return null;
  return (
    <Accordion
      disableGutters
      square
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
          Swap details
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          {best && <Row label="Rate" value={formatRate(best.rate)} />}
          {best && <Row label="Miner" value={shortAddr(best.minerHotkey)} />}
          {state.reserve && (
            <Row
              label="Reserved until"
              value={`Block ${state.reserve.reservedUntilBlock}`}
            />
          )}
          {state.reserve && (
            <Row
              label="Miner source addr"
              value={shortAddr(state.reserve.minerSourceAddress)}
            />
          )}
          {state.sourceTxHash && (
            <Row label="Source tx" value={shortAddr(state.sourceTxHash)} />
          )}
          {state.swapId !== undefined && (
            <Row label="Swap id" value={String(state.swapId)} />
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default SwapDetails;
