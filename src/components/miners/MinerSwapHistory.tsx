import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useMinerSwaps } from '../../api';
import { FONTS } from '../../theme';
import SectionHeading from '../SectionHeading';
import {
  formatTimeAgo,
  lamportsToSol,
  swapDisplayId,
} from '../../utils/format';

// Mirrors the transaction tape (SwapTracker): in-flight states stay neutral,
// only terminal outcomes keep semantic color — completed green / timed-out red.
const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'var(--color-success)',
  TIMED_OUT: 'var(--color-danger)',
  FULFILLED: 'text.secondary',
  ACTIVE: 'text.secondary',
};

// Both bounds are unix-SECONDS strings ("1783562486"), not date strings. `new Date(secs)` parses that
// as a date and yields Invalid Date, so this column rendered "—" for every swap ever. Parse as an int.
// 0 is the not-yet-set sentinel, never a real timestamp.
const asUnix = (v: string | null): number | null => {
  if (v == null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const fmtDuration = (
  initiated: string | null,
  resolved: string | null,
): string => {
  const from = asUnix(initiated);
  const to = asUnix(resolved);
  if (from == null || to == null) return '—';
  const secs = to - from;
  if (secs < 0) return '—';
  if (secs < 60) return `${secs}s`;
  const mins = Math.round(secs / 60);
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
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        p: { xs: 1.5, md: 2.5 },
      }}
    >
      <Box sx={{ mb: 1.5 }}>
        <SectionHeading
          title="Swap History"
          subtitle="this miner's recent swaps"
        />
      </Box>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table
          size="small"
          sx={{
            '& th, & td': {
              borderColor: 'divider',
              fontSize: { xs: '0.7rem', sm: '0.76rem', md: '0.8rem' },
              px: { xs: 1, md: 2 },
              whiteSpace: 'nowrap',
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>swap</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                initiated
              </TableCell>
              <TableCell>status</TableCell>
              <TableCell>amount</TableCell>
              <TableCell>dir</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                dur
              </TableCell>
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
              const solAmount = row.solAmount
                ? lamportsToSol(row.solAmount).toFixed(4)
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
                      {swapDisplayId(row)}
                    </Box>
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: FONTS.mono,
                      display: { xs: 'none', md: 'table-cell' },
                    }}
                  >
                    {formatTimeAgo(row.initiatedAt)}
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
                        borderColor: 'divider',
                        color: STATUS_COLOR[row.status] ?? 'text.secondary',
                      }}
                    >
                      {row.status.replace('_', ' ').toLowerCase()}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontFamily: FONTS.mono }}>
                    {solAmount} SOL
                  </TableCell>
                  <TableCell sx={{ fontFamily: FONTS.mono }}>
                    {row.sourceChain && row.destChain
                      ? `${row.sourceChain.toUpperCase()}→${row.destChain.toUpperCase()}`
                      : '—'}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: FONTS.mono,
                      display: { xs: 'none', md: 'table-cell' },
                    }}
                  >
                    {fmtDuration(row.initiatedAt, row.resolvedAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MinerSwapHistory;
