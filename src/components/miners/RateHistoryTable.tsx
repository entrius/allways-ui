import React, { useMemo } from 'react';
import {
  Box,
  Stack,
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
import DirectionSelect from './DirectionSelect';
import SectionHeading from '../SectionHeading';
import { directionalRate, formatTimeAgo, rateUnit } from '../../utils/format';

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
  const label = isDirection(dir)
    ? directionLabel(dir)
    : `${row.fromChain.toUpperCase()} → ${row.toChain.toUpperCase()}`;
  // A non-sol backing distinguishes the tao-bonded twin of a direction the
  // miner also quotes sol-bonded.
  return row.backing && row.backing !== 'sol'
    ? `${label} · ${row.backing.toUpperCase()} bond`
    : label;
};

// Chronological table twin of the rate graph above it — every quote this
// miner posted, newest first. A QuoteRemoved lands as rate 0. Stored rates
// are canonical "spoke per 1 SOL"; each row renders DIRECTIONALLY ("to per 1
// from" of its own pair), unit-labeled. Filtered by its own direction picker
// (null = all pairs).
const RateHistoryTable: React.FC<{
  hotkey: string;
  direction: Direction | null;
  onDirectionChange: (d: Direction | null) => void;
}> = ({ hotkey, direction, onDirectionChange }) => {
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
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        p: { xs: 1.5, md: 2.5 },
        mb: 3,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 1.5 }}
      >
        <SectionHeading title="Rate History" />
        <DirectionSelect
          value={direction}
          onChange={onDirectionChange}
          allowAll
          width={150}
        />
      </Stack>
      <TableContainer sx={{ overflowX: 'auto', maxHeight: 420 }}>
        <Table
          size="small"
          stickyHeader
          sx={{
            '& th': { backgroundColor: 'background.paper' },
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
              <TableRow
                key={`${row.t}-${row.fromChain}-${row.toChain}-${row.backing}`}
              >
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
                        {rateUnit(row.fromChain, row.toChain)}
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
