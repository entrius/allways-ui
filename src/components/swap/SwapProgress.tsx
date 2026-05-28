import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { FONTS } from '../../theme';
import type { SwapPhase } from '../../hooks/useSwapFlow';

type StepState = 'pending' | 'active' | 'done' | 'failed';

const STEPS: Array<{ key: string; label: string; phases: SwapPhase[] }> = [
  {
    key: 'reserve',
    label: 'Reserve',
    phases: ['awaitingReserveSig', 'reserving'],
  },
  { key: 'send', label: 'Send funds', phases: ['awaitingSend', 'sending'] },
  {
    key: 'confirm',
    label: 'Confirm',
    phases: ['awaitingConfirmSig', 'confirming'],
  },
  { key: 'complete', label: 'Complete', phases: ['watching'] },
];

const computeStates = (phase: SwapPhase): StepState[] => {
  if (phase === 'idle') return STEPS.map(() => 'pending');
  if (phase === 'error') return STEPS.map(() => 'failed');
  if (phase === 'done') return STEPS.map(() => 'done');

  const result: StepState[] = [];
  let seenActive = false;
  for (const step of STEPS) {
    if (step.phases.includes(phase)) {
      result.push('active');
      seenActive = true;
    } else if (seenActive) {
      result.push('pending');
    } else {
      result.push('done');
    }
  }
  return result;
};

const SwapProgress: React.FC<{ phase: SwapPhase; error?: string }> = ({
  phase,
  error,
}) => {
  const states = computeStates(phase);
  return (
    <Stack
      spacing={1.5}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
        Progress
      </Typography>
      {STEPS.map((step, i) => {
        const state = states[i];
        return (
          <Stack
            key={step.key}
            direction="row"
            alignItems="center"
            spacing={1.5}
          >
            <Box
              sx={{
                width: 22,
                height: 22,
                border: '1px solid',
                borderColor:
                  state === 'done'
                    ? 'var(--color-success)'
                    : state === 'failed'
                      ? 'var(--color-danger)'
                      : state === 'active'
                        ? 'primary.main'
                        : 'divider',
                color:
                  state === 'done'
                    ? 'var(--color-success)'
                    : state === 'failed'
                      ? 'var(--color-danger)'
                      : 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
              }}
            >
              {state === 'done' ? (
                <CheckIcon sx={{ fontSize: 14 }} />
              ) : state === 'failed' ? (
                <CloseIcon sx={{ fontSize: 14 }} />
              ) : (
                i + 1
              )}
            </Box>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.85rem',
                color: state === 'active' ? 'text.primary' : 'text.secondary',
                fontWeight: state === 'active' ? 600 : 400,
              }}
            >
              {step.label}
            </Typography>
          </Stack>
        );
      })}
      {error && (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color: 'var(--color-danger)',
            pt: 1,
          }}
        >
          {error}
        </Typography>
      )}
    </Stack>
  );
};

export default SwapProgress;
