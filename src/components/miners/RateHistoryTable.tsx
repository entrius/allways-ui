import React, { useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  decomposeDirection,
  directionLabel,
  isDirection,
  useMinerRateHistory,
  type Direction,
  type MinerRateHistoryRow,
} from '../../api';
import { FONTS } from '../../theme';
import {
  chainSymbol,
  directionalRate,
  formatTimeAgo,
} from '../../utils/format';

const MAX_ROWS = 50;

// Coerce first: ApiUtils hands long floats through as strings (json-bigint
// precision guard), and String.toFixed doesn't exist.
const fmtRate = (raw: number): string => {
  const n = Number(raw);
  const abs = Math.abs(n);
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 1) return n.toFixed(2);
  if (abs >= 0.001) return n.toFixed(4);
  return n.toExponential(1);
};

const pairLabel = (row: MinerRateHistoryRow): string => {
  const dir = `${row.fromChain}-${row.toChain}`.toUpperCase();
  return isDirection(dir)
    ? directionLabel(dir)
    : `${row.fromChain.toUpperCase()} → ${row.toChain.toUpperCase()}`;
};

// Chronological table twin of the rate graph above it — every quote this
// miner posted, newest first. A QuoteRemoved lands as rate 0. Stored rates
// are canonical "spoke per 1 SOL"; each row renders DIRECTIONALLY ("to per 1
// from" of its own pair), unit-labeled.
const RateHistoryTable: React.FC<{
  hotkey: string;
  direction: Direction | null;
}> = ({ hotkey, direction }) => {
  const { data } = useMinerRateHistory(hotkey);

  const { rows, truncated } = useMemo(() => {
    let filtered = data ?? [];
    if (direction) {
      const { from, to } = decomposeDirection(direction);
      filtered = filtered.filter(
        (r) => r.fromChain === from && r.toChain === to,
      );
    }
    const sorted = [...filtered].sort((a, b) => b.t - a.t);
    return {
      rows: sorted.slice(0, MAX_ROWS),
      truncated: sorted.length > MAX_ROWS,
    };
  }, [data, direction]);

  return (
    <Box
      sx={{
        backgroundColor: 'surface.light',
        border: '1px solid',
        borderColor: 'divider',
        p: { xs: 1.5, md: 2.5 },
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
        Rate History
        {direction && (
          <Box
            component="span"
            sx={{ color: 'text.disabled', letterSpacing: '0.08em', ml: 1 }}
          >
            · {directionLabel(direction)}
          </Box>
        )}
      </Typography>
      <TableContainer sx={{ overflowX: 'auto', maxHeight: 420 }}>
        <Table
          size="small"
          stickyHeader
          sx={{
            '& th': { backgroundColor: 'surface.light' },
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
              <TableCell>time</TableCell>
              <TableCell>pair</TableCell>
              <TableCell>rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
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
                    no rate history yet
                  </Box>
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={`${row.t}-${row.fromChain}-${row.toChain}`}>
                <TableCell sx={{ fontFamily: FONTS.mono }}>
                  <Tooltip
                    title={new Date(row.t * 1000).toLocaleString()}
                    placement="top"
                  >
                    <Box component="span">{formatTimeAgo(row.t)}</Box>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontFamily: FONTS.mono }}>
                  {pairLabel(row)}
                </TableCell>
                <TableCell sx={{ fontFamily: FONTS.mono }}>
                  {row.rate === 0 ? (
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
                        color: 'text.disabled',
                      }}
                    >
                      removed
                    </Box>
                  ) : (
                    <>
                      {fmtRate(
                        directionalRate(row.fromChain, row.toChain, row.rate) ??
                          0,
                      )}
                      <Box
                        component="span"
                        sx={{ color: 'text.disabled', ml: 0.5 }}
                      >
                        {`${chainSymbol(row.toChain)}/${chainSymbol(row.fromChain)}`}
                      </Box>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {truncated && (
        <Typography
          variant="mono"
          sx={{ mt: 1, fontSize: '0.6rem', color: 'text.disabled' }}
        >
          showing latest {MAX_ROWS}
        </Typography>
      )}
    </Box>
  );
};

export default RateHistoryTable;
