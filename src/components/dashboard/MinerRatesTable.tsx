import React, { useMemo, useState } from 'react';
import {
  Box,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useMiners, type Miner } from '../../api';
import { FONTS } from '../../theme';
import CopyableAddress from '../CopyableAddress';
import { MinerRatesTableSkeleton } from './Skeletons';

type SortKey = 'uid' | 'pair' | 'rate' | 'collateral' | 'status' | 'hotkey';
type SortDir = 'asc' | 'desc';
type DirectionFilter = 'all' | 'both' | 'forward' | 'reverse';

const formatCollateral = (rao: string) => {
  const tao = parseInt(rao, 10) / 1e9;
  return tao.toFixed(2);
};

const parseRate = (raw: string | null): number => {
  if (!raw) return 0;
  const n = parseFloat(raw);
  return isNaN(n) ? 0 : n;
};

const pairStr = (m: Miner) =>
  m.sourceChain && m.destChain
    ? `${m.sourceChain.toUpperCase()}/${m.destChain.toUpperCase()}`
    : '';

const statusRank = (m: Miner) =>
  !m.isActive ? 3 : m.hasActiveSwap ? 2 : m.isReserved ? 1 : 0;

// Sort by the stronger of the two rates so bidirectional miners aren't penalized
// by a low counter side, and one-way miners still sort by their single quote.
const maxRate = (m: Miner) =>
  Math.max(parseRate(m.rate), parseRate(m.counterRate));

const getSortValue = (m: Miner, key: SortKey): string | number => {
  switch (key) {
    case 'uid':
      return m.uid;
    case 'pair':
      return pairStr(m);
    case 'rate': {
      const v = maxRate(m);
      return v > 0 ? v : -1;
    }
    case 'collateral':
      return parseInt(m.collateralRao, 10) || 0;
    case 'status':
      return statusRank(m);
    case 'hotkey':
      return m.hotkey;
  }
};

const columns: { key: SortKey; label: string }[] = [
  { key: 'uid', label: 'UID' },
  { key: 'pair', label: 'Pair' },
  { key: 'rate', label: 'Rate' },
  { key: 'collateral', label: 'Capacity' },
  { key: 'status', label: 'Status' },
  { key: 'hotkey', label: 'Hotkey' },
];

const MinerRatesTable: React.FC = () => {
  const theme = useTheme();

  const statusDot = (miner: Miner) => {
    if (!miner.isActive)
      return {
        color: theme.palette.text.disabled || theme.palette.text.secondary,
        label: 'Inactive',
      };
    if (miner.hasActiveSwap)
      return { color: theme.palette.status.fulfilled, label: 'Swapping' };
    if (miner.isReserved)
      return { color: theme.palette.status.active, label: 'Reserved' };
    return { color: theme.palette.primary.main, label: 'Available' };
  };

  const headerSx = {
    fontFamily: FONTS.mono,
    fontSize: '0.65rem',
    color: theme.palette.text.secondary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  };

  const cellSx = {
    fontFamily: FONTS.mono,
    fontSize: '0.75rem',
    borderBottom: `1px solid ${theme.palette.divider}`,
  };

  const { data: miners, isLoading } = useMiners();
  const [sortKey, setSortKey] = useState<SortKey>('rate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState<DirectionFilter>('all');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'rate' || key === 'collateral' ? 'desc' : 'asc');
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const directionFiltered = (miners ?? []).filter((m) => {
      const hasForward = parseRate(m.rate) > 0;
      const hasReverse = parseRate(m.counterRate) > 0;
      switch (direction) {
        case 'both':
          return hasForward && hasReverse;
        case 'forward':
          return hasForward;
        case 'reverse':
          return hasReverse;
        case 'all':
        default:
          return hasForward || hasReverse;
      }
    });
    const sorted = [...directionFiltered].sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    if (!q) return sorted.map((m) => ({ miner: m, match: false }));
    return sorted.map((m) => ({
      miner: m,
      match:
        String(m.uid) === q ||
        m.hotkey.toLowerCase().includes(q) ||
        (m.sourceChain?.toLowerCase().includes(q) ?? false) ||
        (m.destChain?.toLowerCase().includes(q) ?? false),
    }));
  }, [miners, sortKey, sortDir, search, direction]);
  const hasSearch = search.trim().length > 0;

  const renderPairCell = (m: Miner) => {
    const src = m.sourceChain?.toUpperCase() ?? '';
    const dst = m.destChain?.toUpperCase() ?? '';
    if (!src || !dst) return '\u2014';
    const hasForward = parseRate(m.rate) > 0;
    const hasReverse = parseRate(m.counterRate) > 0;
    // Bidirectional ⇄, forward-only →, reverse-only ←.
    const glyph =
      hasForward && hasReverse ? '\u21C4' : hasForward ? '\u2192' : '\u2190';
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          fontFamily: FONTS.mono,
        }}
      >
        <span>{src}</span>
        <span
          style={{
            color: theme.palette.primary.main,
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          {glyph}
        </span>
        <span>{dst}</span>
      </Box>
    );
  };

  const renderRateCell = (m: Miner) => {
    const src = m.sourceChain?.toUpperCase() ?? '';
    const dst = m.destChain?.toUpperCase() ?? '';
    const forward = parseRate(m.rate);
    const reverse = parseRate(m.counterRate);
    const disabled =
      theme.palette.text.disabled || theme.palette.text.secondary;
    const formatOr = (v: number) => (v > 0 ? v.toFixed(2) : '\u2014');
    const tooltipLines: string[] = [];
    if (src && dst) {
      tooltipLines.push(
        forward > 0
          ? `${src} \u2192 ${dst}: ${forward.toFixed(6)}`
          : `${src} \u2192 ${dst}: not quoted`,
      );
      tooltipLines.push(
        reverse > 0
          ? `${dst} \u2192 ${src}: ${reverse.toFixed(6)}  (1 ${src} per ${(1 / reverse).toFixed(6)} ${dst})`
          : `${dst} \u2192 ${src}: not quoted`,
      );
    }
    return (
      <Tooltip
        title={
          tooltipLines.length > 0 ? (
            <Box sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem' }}>
              {tooltipLines.map((line) => (
                <Box key={line}>{line}</Box>
              ))}
            </Box>
          ) : (
            ''
          )
        }
        arrow
        placement="top"
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 0.5,
            fontFamily: FONTS.mono,
            cursor: tooltipLines.length > 0 ? 'help' : 'default',
          }}
        >
          <span
            style={{
              color: forward > 0 ? theme.palette.primary.main : disabled,
            }}
          >
            {formatOr(forward)}
          </span>
          <span style={{ color: theme.palette.text.disabled }}>/</span>
          <span
            style={{
              color: reverse > 0 ? theme.palette.text.secondary : disabled,
            }}
          >
            {formatOr(reverse)}
          </span>
        </Box>
      </Tooltip>
    );
  };

  const isOneWay = (m: Miner) => {
    const hasForward = parseRate(m.rate) > 0;
    const hasReverse = parseRate(m.counterRate) > 0;
    return hasForward !== hasReverse;
  };

  return isLoading || !miners ? (
    <MinerRatesTableSkeleton />
  ) : (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontFamily: FONTS.heading, fontWeight: 700 }}
        >
          Active Providers
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <ToggleButtonGroup
            size="small"
            exclusive
            value={direction}
            onChange={(_, v) => v && setDirection(v as DirectionFilter)}
            sx={{
              '& .MuiToggleButton-root': {
                fontFamily: FONTS.mono,
                fontSize: '0.65rem',
                px: 1.25,
                py: 0.5,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                border: `1px solid ${theme.palette.divider}`,
                color: theme.palette.text.secondary,
              },
              '& .Mui-selected': {
                backgroundColor: `${theme.palette.primary.main}22 !important`,
                color: `${theme.palette.primary.main} !important`,
                borderColor: `${theme.palette.primary.main} !important`,
              },
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="both">{'\u21C4'} Both</ToggleButton>
            <ToggleButton value="forward">{'\u2192'} Forward</ToggleButton>
            <ToggleButton value="reverse">{'\u2190'} Reverse</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            size="small"
            placeholder="Search UID, hotkey..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: 200,
              '& .MuiOutlinedInput-root': {
                fontFamily: FONTS.mono,
                fontSize: '0.75rem',
                color: 'text.primary',
                borderRadius: 0,
                height: 32,
                '& fieldset': { borderColor: 'divider' },
                '&:hover fieldset': { borderColor: theme.palette.border.light },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              },
            }}
          />
        </Box>
      </Box>

      <TableContainer
        sx={{
          maxHeight: 500,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.border.light,
            borderRadius: 0,
          },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} sx={headerSx}>
                  <TableSortLabel
                    active={sortKey === col.key}
                    direction={sortKey === col.key ? sortDir : 'asc'}
                    onClick={() => handleSort(col.key)}
                    sx={{
                      color: `${theme.palette.text.secondary} !important`,
                      '&.Mui-active': {
                        color: `${theme.palette.text.primary} !important`,
                      },
                      '& .MuiTableSortLabel-icon': {
                        color: `${theme.palette.text.secondary} !important`,
                        fontSize: '0.75rem',
                      },
                    }}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(({ miner, match }) => {
              const status = statusDot(miner);
              const highlight = hasSearch && match;
              const dimmed = hasSearch && !match;
              const oneWay = isOneWay(miner);
              return (
                <TableRow
                  key={miner.uid}
                  sx={{
                    '&:hover': { backgroundColor: 'background.paper' },
                    transition: 'background-color 0.15s, opacity 0.15s',
                    backgroundColor: highlight
                      ? `${theme.palette.primary.main}12`
                      : 'transparent',
                    opacity: dimmed ? 0.3 : 1,
                    borderLeft: oneWay
                      ? `2px solid ${theme.palette.text.disabled || theme.palette.text.secondary}`
                      : '2px solid transparent',
                  }}
                >
                  <TableCell sx={{ ...cellSx, color: 'text.primary' }}>
                    {miner.uid}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, color: 'text.secondary' }}>
                    {renderPairCell(miner)}
                  </TableCell>
                  <TableCell sx={{ ...cellSx }}>
                    {renderRateCell(miner)}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, color: 'text.secondary' }}>
                    {formatCollateral(miner.collateralRao)}
                  </TableCell>
                  <TableCell
                    sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: 0,
                          backgroundColor: status.color,
                        }}
                      />
                      <Typography
                        sx={{
                          fontFamily: FONTS.mono,
                          fontSize: '0.7rem',
                          color: 'text.secondary',
                        }}
                      >
                        {status.label}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell
                    sx={{
                      ...cellSx,
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                    }}
                  >
                    <CopyableAddress address={miner.hotkey} />
                  </TableCell>
                </TableRow>
              );
            })}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  sx={{
                    textAlign: 'center',
                    borderBottom: 'none',
                    py: 4,
                    fontFamily: FONTS.mono,
                    fontSize: '0.8rem',
                    color: 'text.secondary',
                  }}
                >
                  {miners?.length
                    ? 'No miners match the current filter'
                    : 'No miners registered'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MinerRatesTable;
