import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  IconButton,
  InputAdornment,
  Stack,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useMiners, type Miner } from '../../api';
import type { Direction } from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import CopyableAddress from '../CopyableAddress';
import { MinerRatesTableSkeleton } from './Skeletons';
import { formatRate } from '../../utils/format';

type SortKey = 'uid' | 'rate' | 'collateral' | 'status';
type SortDir = 'asc' | 'desc';
type DirectionFilter = 'forward' | 'reverse';
// Open = idle/tradeable now; Active = also reserved/exchanging; All = + inactive.
type StatusFilter = 'open' | 'active' | 'all';

const formatCollateral = (rao: string) => {
  const tao = parseInt(rao, 10) / 1e9;
  return tao.toFixed(2);
};

const parseRate = (raw: string | null): number => {
  if (!raw) return 0;
  const n = parseFloat(raw);
  return isNaN(n) ? 0 : n;
};

const statusRank = (m: Miner) =>
  !m.isActive ? 3 : m.hasActiveSwap ? 2 : m.isReserved ? 1 : 0;

// The quoted rate for the active direction (TAO per 1 BTC either way). Sorting
// on the raw value lets the sort arrow read naturally — desc = highest first
// for BTC→TAO (best), asc = lowest first for TAO→BTC (best).
const directionRate = (m: Miner, filter: DirectionFilter): number =>
  filter === 'reverse' ? parseRate(m.counterRate) : parseRate(m.rate);

const getSortValue = (
  m: Miner,
  key: SortKey,
  filter: DirectionFilter,
): string | number => {
  switch (key) {
    case 'uid':
      return m.uid;
    case 'rate':
      return directionRate(m, filter);
    case 'collateral':
      return parseInt(m.collateralRao, 10) || 0;
    case 'status':
      return statusRank(m);
  }
};

const columns: { key: SortKey; label: string; align?: 'right' | 'center' }[] = [
  { key: 'uid', label: 'UID' },
  { key: 'rate', label: 'Rate' },
  { key: 'collateral', label: 'Capacity', align: 'right' },
  { key: 'status', label: 'Status' },
];

const MinerRatesTable: React.FC<{ syncDirection?: Direction }> = ({
  syncDirection,
}) => {
  const theme = useTheme();
  const disabled = theme.palette.text.disabled || theme.palette.text.secondary;
  // On phones drop the hotkey + Status column so the table stays compact and
  // never needs to scroll horizontally.
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const visibleColumns = isMobile
    ? columns.filter((c) => c.key !== 'status')
    : columns;

  // Direction is driven by the page's Market Rate toggle — no local toggle.
  const directionFilter: DirectionFilter =
    syncDirection === 'TAO-BTC' ? 'reverse' : 'forward';

  const statusInfo = (miner: Miner) => {
    if (!miner.isActive) return { color: disabled, label: 'Inactive' };
    if (miner.hasActiveSwap)
      return { color: theme.palette.status.fulfilled, label: 'Exchanging' };
    if (miner.isReserved)
      return { color: theme.palette.status.active, label: 'Reserved' };
    return { color: theme.palette.primary.main, label: 'Available' };
  };

  const headerSx = {
    fontFamily: FONTS.mono,
    fontSize: { xs: '0.58rem', sm: '0.65rem' },
    color: theme.palette.text.secondary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    px: { xs: 0.75, sm: 1 },
  };

  const cellSx = {
    fontFamily: FONTS.mono,
    fontSize: { xs: '0.68rem', sm: '0.75rem' },
    borderBottom: `1px solid ${theme.palette.divider}`,
    px: { xs: 0.75, sm: 1 },
    fontVariantNumeric: 'tabular-nums' as const,
  };

  const { data: miners, isLoading } = useMiners();
  const [sortKey, setSortKey] = useState<SortKey>('rate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  // When the EMA chart's direction flips, re-default the table to the most
  // advantageous rate first: BTC→TAO highest first (desc), TAO→BTC lowest
  // first (asc). A manual re-sort persists until the next flip.
  useEffect(() => {
    setSortKey('rate');
    setSortDir(syncDirection === 'TAO-BTC' ? 'asc' : 'desc');
  }, [syncDirection]);

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
    const base = (miners ?? []).filter((m) => {
      const hasQuote =
        directionFilter === 'reverse'
          ? parseRate(m.counterRate) > 0
          : parseRate(m.rate) > 0;
      if (!hasQuote) return false;
      if (statusFilter === 'all') return true;
      if (!m.isActive) return false;
      if (statusFilter === 'open') return !m.hasActiveSwap && !m.isReserved;
      return true; // 'active' — any non-inactive node
    });
    const sorted = [...base].sort((a, b) => {
      // Primary sort is the chosen column (default: rate, most-advantageous
      // first for the active direction). Ties break toward the most tradeable
      // node (Available → Reserved → Exchanging → Inactive).
      const av = getSortValue(a, sortKey, directionFilter);
      const bv = getSortValue(b, sortKey, directionFilter);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
      return statusRank(a) - statusRank(b);
    });
    if (!q) return sorted.map((m) => ({ miner: m, match: false }));
    return sorted.map((m) => ({
      miner: m,
      match: String(m.uid) === q || m.hotkey.toLowerCase().includes(q),
    }));
  }, [miners, sortKey, sortDir, search, directionFilter, statusFilter]);
  const hasSearch = search.trim().length > 0;

  const renderRate = (m: Miner) => {
    const v =
      directionFilter === 'reverse'
        ? parseRate(m.counterRate)
        : parseRate(m.rate);
    if (v <= 0)
      return (
        <Box component="span" sx={{ color: disabled }}>
          {'—'}
        </Box>
      );
    return (
      <Box component="span">
        {formatRate(v)}
        <Box component="span" sx={{ color: 'text.secondary', ml: 0.5 }}>
          τ
        </Box>
      </Box>
    );
  };

  return isLoading || !miners ? (
    <MinerRatesTableSkeleton />
  ) : (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Box
        sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 1.5 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            Active Rates
          </Typography>
          <Tooltip
            title={
              <Box sx={{ maxWidth: 280 }}>
                Live exchange rates quoted by active network nodes for the
                selected direction (set by the EMA panel's toggle). Sort by rate
                or capacity to find the best counterparty.
              </Box>
            }
            arrow
            placement="right"
          >
            <IconButton size="small" sx={{ p: 0, color: 'text.secondary' }}>
              <InfoOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
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
              flex: 1,
              minWidth: 140,
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
          <Tooltip
            title={
              <Box sx={{ maxWidth: 220, fontSize: '0.7rem' }}>
                <strong>Open</strong>: idle nodes you can trade with now.{' '}
                <strong>Active</strong>: also reserved/exchanging.{' '}
                <strong>All</strong>: include inactive.
              </Box>
            }
            arrow
            placement="top"
          >
            <ToggleButtonGroup
              size="small"
              exclusive
              value={statusFilter}
              onChange={(_, v) => v && setStatusFilter(v as StatusFilter)}
              sx={{
                '& .MuiToggleButton-root': {
                  fontFamily: FONTS.mono,
                  fontSize: '0.6rem',
                  px: 1,
                  py: 0.5,
                  height: 32,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  borderRadius: 0,
                  border: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.text.secondary,
                },
                '& .Mui-selected': {
                  backgroundColor: `${theme.palette.primary.main}22 !important`,
                  color: `${theme.palette.primary.main} !important`,
                  borderColor: `${theme.palette.primary.main} !important`,
                },
                '& .Mui-selected + .MuiToggleButton-root': {
                  borderLeftColor: `${theme.palette.primary.main} !important`,
                },
              }}
            >
              <ToggleButton value="open">Open</ToggleButton>
              <ToggleButton value="active">Active</ToggleButton>
              <ToggleButton value="all">All</ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
        </Box>
      </Box>

      <TableContainer
        sx={{
          flex: 1,
          minHeight: 0,
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
              {visibleColumns.map((col) => (
                <TableCell key={col.key} align={col.align} sx={headerSx}>
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
              const status = statusInfo(miner);
              const highlight = hasSearch && match;
              const dimmed = hasSearch && !match;
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
                  }}
                >
                  {/* UID with the hotkey folded underneath (hotkey hidden on
                      mobile to keep the table compact). */}
                  <TableCell sx={{ ...cellSx, minWidth: { xs: 0, sm: 92 } }}>
                    <Stack spacing={0.25}>
                      <Box component="span" sx={{ color: 'text.primary' }}>
                        {miner.uid}
                      </Box>
                      {!isMobile && (
                        <Box
                          component="span"
                          sx={{ fontSize: '0.62rem', color: 'text.secondary' }}
                        >
                          <CopyableAddress address={miner.hotkey} />
                        </Box>
                      )}
                    </Stack>
                  </TableCell>

                  <TableCell sx={{ ...cellSx, color: 'text.primary' }}>
                    {renderRate(miner)}
                  </TableCell>

                  <TableCell
                    align="right"
                    sx={{ ...cellSx, color: 'text.secondary' }}
                  >
                    <Tooltip
                      title={
                        <Box
                          sx={{
                            fontFamily: FONTS.mono,
                            fontSize: '0.7rem',
                            maxWidth: 240,
                          }}
                        >
                          Total TAO collateral backing this node — caps exchange
                          size and is what gets slashed on failure to deliver.
                        </Box>
                      }
                      arrow
                      placement="top"
                    >
                      <Box component="span">
                        {formatCollateral(miner.collateralRao)}
                        <Box
                          component="span"
                          sx={{ color: 'text.secondary', ml: 0.5 }}
                        >
                          τ
                        </Box>
                      </Box>
                    </Tooltip>
                  </TableCell>

                  {!isMobile && (
                    <TableCell sx={cellSx}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                        }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            backgroundColor: status.color,
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          sx={{
                            fontFamily: FONTS.mono,
                            fontSize: '0.7rem',
                            color: 'text.secondary',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {status.label}
                        </Typography>
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
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
                    ? 'No nodes match the current filter'
                    : 'No network nodes registered'}
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
