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
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useMiners, type Miner } from '../../api';
import { COLORS, FONTS } from '../../theme';

type SortKey = 'uid' | 'pair' | 'rate' | 'collateral' | 'status' | 'hotkey';
type SortDir = 'asc' | 'desc';

const statusDot = (miner: Miner) => {
  if (!miner.isActive) return { color: COLORS.textMuted, label: 'Inactive' };
  if (miner.hasActiveSwap) return { color: '#f59e0b', label: 'Swapping' };
  return { color: COLORS.primary, label: 'Available' };
};

const formatCollateral = (rao: string) => {
  const tao = parseInt(rao, 10) / 1e9;
  return tao.toFixed(2);
};

const shortAddr = (addr: string) =>
  addr.length > 10 ? `${addr.slice(0, 4)}..${addr.slice(-3)}` : addr;

const pairStr = (m: Miner) =>
  m.sourceChain && m.destChain
    ? `${m.sourceChain.toUpperCase()}/${m.destChain.toUpperCase()}`
    : '';

const statusRank = (m: Miner) => (!m.isActive ? 2 : m.hasActiveSwap ? 1 : 0);

const getSortValue = (m: Miner, key: SortKey): string | number => {
  switch (key) {
    case 'uid':
      return m.uid;
    case 'pair':
      return pairStr(m);
    case 'rate':
      return m.rate ? parseFloat(m.rate) : -1;
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
  { key: 'rate', label: 'Rate (TAO)' },
  { key: 'collateral', label: 'Capacity' },
  { key: 'status', label: 'Status' },
  { key: 'hotkey', label: 'Hotkey' },
];

const headerSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.65rem',
  color: COLORS.textMuted,
  borderBottom: `1px solid ${COLORS.border}`,
  backgroundColor: COLORS.bg,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const cellSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.75rem',
  borderBottom: `1px solid ${COLORS.border}`,
};

const MinerRatesTable: React.FC = () => {
  const { data: miners = [] } = useMiners();

  const [sortKey, setSortKey] = useState<SortKey>('rate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');

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
    const sorted = [...miners].sort((a, b) => {
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
  }, [miners, sortKey, sortDir, search]);

  const hasSearch = search.trim().length > 0;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontFamily: FONTS.heading, fontWeight: 700 }}
        >
          Miner Rates
        </Typography>
        <TextField
          size="small"
          placeholder="Search UID, hotkey..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: COLORS.textMuted }} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: 200,
            '& .MuiOutlinedInput-root': {
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              color: COLORS.white,
              '& fieldset': { borderColor: COLORS.border },
              '&:hover fieldset': { borderColor: COLORS.borderLight },
              '&.Mui-focused fieldset': { borderColor: COLORS.primary },
            },
          }}
        />
      </Box>
      <TableContainer
        sx={{
          maxHeight: 500,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: COLORS.borderLight,
            borderRadius: 2,
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
                      color: `${COLORS.textMuted} !important`,
                      '&.Mui-active': {
                        color: `${COLORS.white} !important`,
                      },
                      '& .MuiTableSortLabel-icon': {
                        color: `${COLORS.textMuted} !important`,
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
              return (
                <TableRow
                  key={miner.uid}
                  sx={{
                    '&:hover': { backgroundColor: COLORS.surface },
                    transition: 'background-color 0.15s, opacity 0.15s',
                    backgroundColor: highlight
                      ? `${COLORS.primary}12`
                      : 'transparent',
                    opacity: dimmed ? 0.3 : 1,
                  }}
                >
                  <TableCell sx={{ ...cellSx, color: COLORS.white }}>
                    {miner.uid}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, color: COLORS.textSecondary }}>
                    {pairStr(miner) || '\u2014'}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, color: COLORS.primary }}>
                    {miner.rate ? parseFloat(miner.rate).toFixed(2) : '\u2014'}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, color: COLORS.textSecondary }}>
                    {formatCollateral(miner.collateralRao)} TAO
                  </TableCell>
                  <TableCell
                    sx={{ borderBottom: `1px solid ${COLORS.border}` }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: status.color,
                        }}
                      />
                      <Typography
                        sx={{
                          fontFamily: FONTS.mono,
                          fontSize: '0.7rem',
                          color: status.color,
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
                      color: COLORS.textMuted,
                    }}
                  >
                    {shortAddr(miner.hotkey)}
                  </TableCell>
                </TableRow>
              );
            })}
            {miners.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  sx={{
                    textAlign: 'center',
                    color: COLORS.textMuted,
                    borderBottom: 'none',
                    py: 4,
                  }}
                >
                  No miners registered
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
