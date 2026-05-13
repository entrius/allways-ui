import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useMinerSwaps } from '../../api';
import { FONTS } from '../../theme';

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'success.main',
  TIMED_OUT: 'error.main',
  FULFILLED: 'status.fulfilled',
  ACTIVE: 'status.active',
};

const PILL_BORDER: Record<string, string> = {
  COMPLETED: 'rgba(21,128,61,0.5)',
  TIMED_OUT: 'rgba(185,28,28,0.5)',
};

const fmtBlock = (raw: string | null): string => {
  if (!raw) return '—';
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return '—';
  return `#${n.toLocaleString()}`;
};

const fmtDuration = (
  initiated: string | null,
  resolved: string | null,
): string => {
  if (!initiated || !resolved) return '—';
  const ms = new Date(resolved).getTime() - new Date(initiated).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
};

const MinerSwapHistory: React.FC<{ hotkey: string }> = ({ hotkey }) => {
  const { data } = useMinerSwaps(hotkey, { limit: 25 });
  const rows = data?.rows ?? [];

  return (
    <Box
      sx={{
        backgroundColor: 'surface.light',
        border: '1px solid',
        borderColor: 'divider',
        p: 2.5,
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
        Swap History
      </Typography>
      <Table size="small" sx={{ '& th, & td': { borderColor: 'divider' } }}>
        <TableHead>
          <TableRow>
            <TableCell>swap</TableCell>
            <TableCell>initiated</TableCell>
            <TableCell>status</TableCell>
            <TableCell>amount</TableCell>
            <TableCell>dir</TableCell>
            <TableCell>dur</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                sx={{ textAlign: 'center', color: 'text.disabled' }}
              >
                <Box
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.75rem',
                    color: 'text.disabled',
                    p: 1.5,
                    border: '1px dashed',
                    borderColor: 'divider',
                    mt: 1,
                  }}
                >
                  No swaps yet — post a competitive rate to attract them
                </Box>
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => {
            const taoAmount = row.taoAmount
              ? parseFloat(row.taoAmount).toFixed(4)
              : '—';
            return (
              <TableRow key={row.swapId}>
                <TableCell sx={{ fontFamily: FONTS.mono }}>
                  <Box
                    component={RouterLink}
                    to={`/swap/${row.swapId}`}
                    sx={{
                      color: 'primary.main',
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    #{row.swapId}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontFamily: FONTS.mono }}>
                  {fmtBlock(row.initiatedBlock)}
                </TableCell>
                <TableCell>
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-block',
                      px: 1.25,
                      py: 0.25,
                      fontFamily: FONTS.mono,
                      fontSize: '0.65rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      border: '1px solid',
                      borderColor: PILL_BORDER[row.status] ?? 'divider',
                      color: STATUS_COLOR[row.status] ?? 'text.primary',
                    }}
                  >
                    {row.status.replace('_', ' ').toLowerCase()}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontFamily: FONTS.mono }}>
                  {taoAmount} τ
                </TableCell>
                <TableCell sx={{ fontFamily: FONTS.mono }}>
                  {row.sourceChain?.toUpperCase()}→
                  {row.destChain?.toUpperCase()}
                </TableCell>
                <TableCell sx={{ fontFamily: FONTS.mono }}>
                  {fmtDuration(row.initiatedAt, row.resolvedAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
};

export default MinerSwapHistory;
