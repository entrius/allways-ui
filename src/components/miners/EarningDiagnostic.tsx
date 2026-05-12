import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useMinerDiagnostic } from '../../api';
import type { DiagnosticRow } from '../../api';
import { FONTS } from '../../theme';

const SEVERITY_COLOR: Record<DiagnosticRow['severity'], string> = {
  fail: 'error.main',
  warn: 'secondary.main',
  ok: 'success.main',
};

const SEVERITY_ICON: Record<DiagnosticRow['severity'], string> = {
  fail: '✕',
  warn: '⚠',
  ok: '✓',
};

export const EarningNowBanner: React.FC<{ hotkey: string }> = ({ hotkey }) => {
  const { data } = useMinerDiagnostic(hotkey);
  const rows = data ?? [];
  const top =
    rows.find((r) => r.severity === 'fail') ??
    rows.find((r) => r.severity === 'warn');

  const isOk = !top;
  const headline = isOk
    ? (rows.find((r) => r.severity === 'ok')?.headline ?? 'Earning normally')
    : top!.headline;
  const detail = isOk
    ? (rows.find((r) => r.severity === 'ok')?.detail ?? '')
    : top!.detail;
  const action = isOk ? undefined : top!.action;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={2}
      sx={{
        py: 2,
        px: 2.5,
        mb: 2.5,
        backgroundColor: isOk ? 'rgba(21,128,61,0.06)' : 'rgba(185,28,28,0.06)',
        border: '1px solid',
        borderColor: isOk ? 'rgba(21,128,61,0.3)' : 'rgba(185,28,28,0.3)',
      }}
    >
      <Typography
        variant="monoSmall"
        sx={{
          fontSize: '0.65rem',
          letterSpacing: '0.22em',
          color: isOk ? 'success.main' : 'error.main',
        }}
      >
        earning now
      </Typography>
      <Typography sx={{ flex: 1, fontSize: '0.9rem' }}>
        <Box component="span" sx={{ fontWeight: 600 }}>
          {isOk ? 'Earning.' : 'Not earning.'}
        </Box>{' '}
        {headline}
        {detail && (
          <Box component="span" sx={{ color: 'text.secondary', ml: 0.5 }}>
            — {detail}
          </Box>
        )}
      </Typography>
      {action && (
        <Button
          variant="contained"
          size="small"
          onClick={() => {
            if (action.kind === 'cli-command') {
              navigator.clipboard
                ?.writeText(action.value)
                .catch(() => undefined);
            } else if (action.kind === 'link') {
              window.open(action.value, '_blank');
            }
          }}
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          {action.label}
        </Button>
      )}
    </Stack>
  );
};

export const EarningDiagnostic: React.FC<{ hotkey: string }> = ({ hotkey }) => {
  const { data } = useMinerDiagnostic(hotkey);
  const rows = data ?? [];

  return (
    <Box
      sx={{
        backgroundColor: 'surface.light',
        border: '1px solid',
        borderColor: 'divider',
        p: 2.5,
        mb: 3,
      }}
    >
      <Typography
        variant="monoSmall"
        sx={{
          fontSize: '0.7rem',
          letterSpacing: '0.22em',
          color: 'text.secondary',
          mb: 1.5,
        }}
      >
        Diagnostic
      </Typography>
      {rows.map((row, idx) => (
        <Stack
          key={row.code + idx}
          direction="row"
          spacing={2}
          sx={{
            py: 1.75,
            borderBottom: idx === rows.length - 1 ? 'none' : '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              width: 18,
              flexShrink: 0,
              fontFamily: FONTS.mono,
              fontSize: '1rem',
              color: SEVERITY_COLOR[row.severity],
              mt: 0.25,
            }}
          >
            {SEVERITY_ICON[row.severity]}
          </Box>
          <Box sx={{ flex: 1, fontSize: '0.9rem', lineHeight: 1.4 }}>
            <Box component="span" sx={{ fontWeight: 600 }}>
              {row.headline}
            </Box>
            <Typography
              sx={{
                color: 'text.disabled',
                fontSize: '0.8rem',
                mt: 0.5,
                fontFamily: FONTS.mono,
              }}
            >
              {row.detail}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Box>
  );
};
