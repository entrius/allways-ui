import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
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
import {
  decomposeDirection,
  type Direction,
} from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import CopyableAddress from '../CopyableAddress';
import { MinerRatesTableSkeleton } from './Skeletons';
import { directionalRate, formatRate } from '../../utils/format';
import { hubChain } from '../../api/models/chains';

type SortKey = 'uid' | 'rateFwd' | 'rateRev' | 'collateral' | 'status';
type SortDir = 'asc' | 'desc';
// A leg of a miner's pair: forward = SOL→spoke (m.rate), reverse = spoke→SOL
// (m.counterRate). Both legs render at once; the leg only picks columns.
type Leg = 'forward' | 'reverse';

// The non-hub side of a miner's pair (canonical order pins SOL as source, so
// this is normally destChain), lowercased — or null if the miner has no pair.
const minerSpoke = (m: Miner): string | null => {
  const chains = [m.sourceChain, m.destChain]
    .map((c) => c?.toLowerCase())
    .filter((c): c is string => !!c && c !== hubChain());
  return chains[0] ?? null;
};
// Open = idle/tradeable now; Active = also reserved/exchanging; All = + inactive.
type StatusFilter = 'open' | 'active' | 'all';

const formatCollateral = (lamports: string) => {
  const sol = parseInt(lamports, 10) / 1e9;
  return sol.toFixed(2);
};

const parseRate = (raw: string | null): number => {
  if (!raw) return 0;
  const n = parseFloat(raw);
  return isNaN(n) ? 0 : n;
};

const statusRank = (m: Miner) =>
  !m.isActive ? 3 : m.hasActiveSwap ? 2 : m.isReserved ? 1 : 0;

// The leg's (from, to) chains: forward = SOL→spoke (m.rate), reverse =
// spoke→SOL (m.counterRate). Both STORED values are canonical "spoke per 1
// SOL" (see api/models/Miners.ts) — never per-direction.
const legChains = (m: Miner, leg: Leg): [string, string] => {
  const spoke = minerSpoke(m) ?? '';
  const hub = hubChain();
  return leg === 'reverse' ? [spoke, hub] : [hub, spoke];
};

// The DIRECTIONAL rate for a leg ("to per 1 from" — what the user receives
// per 1 sent; the reverse leg inverts the canonical stored value). Higher is
// always more output per unit in — best-first is desc for every direction.
const legRate = (m: Miner, leg: Leg): number => {
  const [from, to] = legChains(m, leg);
  const raw = leg === 'reverse' ? m.counterRate : m.rate;
  return directionalRate(from, to, raw) ?? 0;
};

const getSortValue = (m: Miner, key: SortKey): string | number => {
  switch (key) {
    case 'uid':
      // Unregistered miners (uid null) sort after every real uid.
      return m.uid ?? Number.POSITIVE_INFINITY;
    case 'rateFwd':
      return legRate(m, 'forward');
    case 'rateRev':
      return legRate(m, 'reverse');
    case 'collateral':
      return parseInt(m.collateral, 10) || 0;
    case 'status':
      return statusRank(m);
  }
};

const MinerRatesTable: React.FC<{ syncDirection?: Direction }> = ({
  syncDirection,
}) => {
  const theme = useTheme();
  const disabled = theme.palette.text.disabled || theme.palette.text.secondary;
  // On phones drop the address line + Status column so the table stays compact
  // and never needs to scroll horizontally.
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // The page's Market Rate toggle picks the PAIR (spoke) we filter miners to
  // and which leg's column leads the default sort — both legs' rates always
  // render side by side.
  const { spoke, leg: selectedLeg } = decomposeDirection(
    syncDirection ?? 'SOL-BTC',
  );

  // Widths are percentages for the fixed table layout, so the table always
  // fits its container instead of growing a horizontal scrollbar. Headers
  // spell out what 1 unit sent buys ("1 SOL →" / "1 BTC →").
  const SPOKE = spoke.toUpperCase();
  const columns: {
    key: SortKey;
    label: string;
    align?: 'right' | 'center';
    width: string;
  }[] = [
    { key: 'uid', label: 'UID', width: isMobile ? '24%' : '22%' },
    { key: 'rateFwd', label: '1 SOL →', width: isMobile ? '28%' : '25%' },
    { key: 'rateRev', label: `1 ${SPOKE} →`, width: isMobile ? '28%' : '25%' },
    {
      key: 'collateral',
      label: 'Capacity (SOL)',
      align: 'right',
      width: isMobile ? '20%' : '16%',
    },
    { key: 'status', label: 'Status', align: 'center', width: '12%' },
  ];
  const visibleColumns = isMobile
    ? columns.filter((c) => c.key !== 'status')
    : columns;

  // Monochrome status scale: the more tradeable, the darker the dot.
  const statusInfo = (miner: Miner) => {
    if (!miner.isActive) return { color: disabled, label: 'Inactive' };
    if (miner.hasActiveSwap)
      return { color: theme.palette.text.secondary, label: 'Exchanging' };
    if (miner.isReserved)
      return { color: theme.palette.text.secondary, label: 'Reserved' };
    return { color: theme.palette.text.primary, label: 'Available' };
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
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const { data: miners, isLoading } = useMiners();
  const [sortKey, setSortKey] = useState<SortKey>('rateFwd');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  // When the EMA chart's direction flips, re-default the sort to that leg's
  // rate column, most advantageous first. Rates sort DIRECTIONALLY ("to per 1
  // from"), so more output is always better → highest first (desc). A manual
  // re-sort persists until the next flip.
  useEffect(() => {
    setSortKey(selectedLeg === 'reverse' ? 'rateRev' : 'rateFwd');
    setSortDir('desc');
  }, [syncDirection, selectedLeg]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(
        key === 'rateFwd' || key === 'rateRev' || key === 'collateral'
          ? 'desc'
          : 'asc',
      );
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = (miners ?? []).filter((m) => {
      // Only nodes on the selected pair (SOL/BTC vs SOL/TAO) — a miner serves
      // one pair, so a SOL/TAO node must not appear under a SOL/BTC view.
      if (minerSpoke(m) !== spoke) return false;
      // Both legs render, so a quote on either side earns the row.
      const hasQuote = parseRate(m.rate) > 0 || parseRate(m.counterRate) > 0;
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
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
      return statusRank(a) - statusRank(b);
    });
    if (!q) return sorted.map((m) => ({ miner: m, match: false }));
    return sorted.map((m) => ({
      miner: m,
      match: String(m.uid) === q || m.hotkey.toLowerCase().includes(q),
    }));
  }, [miners, sortKey, sortDir, search, spoke, statusFilter]);
  const hasSearch = search.trim().length > 0;

  // "0.00096608 BTC" — the amount 1 unit sent buys on this leg; the header
  // carries the "1 SOL →" half of the sentence.
  const renderRate = (m: Miner, leg: Leg) => {
    const v = legRate(m, leg);
    if (v <= 0)
      return (
        <Box component="span" sx={{ color: disabled }}>
          {'—'}
        </Box>
      );
    const [, to] = legChains(m, leg);
    return (
      <Box component="span">
        {formatRate(v)}
        <Box component="span" sx={{ color: 'text.secondary', ml: 0.5 }}>
          {to.toUpperCase()}
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
          {/* The chart's toggle scopes this table to its PAIR — say so. */}
          <Chip
            label={`SOL ⇄ ${SPOKE}`}
            size="small"
            variant="outlined"
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.6rem',
              height: 18,
              borderRadius: 0,
              color: 'text.secondary',
            }}
          />
          <Tooltip
            title={
              <Box sx={{ maxWidth: 280 }}>
                Live exchange rates quoted by active network nodes for the
                selected pair, both directions at once — each rate column is
                what 1 unit sent buys. Sort by either rate or capacity to find
                the best counterparty.
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
              <Box sx={{ maxWidth: 220 }}>
                {[
                  { term: 'Open', desc: 'idle nodes you can trade with now.' },
                  { term: 'Active', desc: 'also reserved/exchanging.' },
                  { term: 'All', desc: 'include inactive.' },
                ].map(({ term, desc }) => (
                  <Typography key={term} sx={{ fontSize: '0.7rem' }}>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {term}
                    </Box>
                    : {desc}
                  </Typography>
                ))}
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
                  backgroundColor: `${theme.palette.text.primary} !important`,
                  color: `${theme.palette.background.paper} !important`,
                  borderColor: `${theme.palette.text.primary} !important`,
                },
                '& .Mui-selected + .MuiToggleButton-root': {
                  borderLeftColor: `${theme.palette.text.primary} !important`,
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
          // Vertical scroll only — the fixed table layout below guarantees the
          // columns always fit the column width.
          overflowX: 'hidden',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.border.light,
            borderRadius: 0,
          },
        }}
      >
        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              {visibleColumns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align}
                  sx={{ ...headerSx, width: col.width }}
                >
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
                  key={miner.hotkey}
                  sx={{
                    '&:hover': { backgroundColor: 'action.hover' },
                    transition: 'background-color 0.15s, opacity 0.15s',
                    backgroundColor: highlight
                      ? theme.palette.action.selected
                      : 'transparent',
                    opacity: dimmed ? 0.3 : 1,
                  }}
                >
                  {/* UID only — the hotkey is searchable (and lives on the
                      miner detail page) but doesn't earn a row line here. */}
                  <TableCell sx={cellSx}>
                    <Stack spacing={0.25}>
                      {/* uid is null when the hotkey isn't registered on the
                          metagraph — show an explicit dash, never a fake 0. */}
                      <Box component="span" sx={{ color: 'text.primary' }}>
                        {miner.uid ?? '—'}
                      </Box>
                      {!isMobile && miner.solanaPubkey && (
                        <Box
                          component="span"
                          sx={{ fontSize: '0.62rem', color: 'text.disabled' }}
                        >
                          <CopyableAddress address={miner.solanaPubkey} />
                        </Box>
                      )}
                    </Stack>
                  </TableCell>

                  <TableCell sx={{ ...cellSx, color: 'text.primary' }}>
                    {renderRate(miner, 'forward')}
                  </TableCell>

                  <TableCell sx={{ ...cellSx, color: 'text.primary' }}>
                    {renderRate(miner, 'reverse')}
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
                          Total SOL collateral backing this node — caps exchange
                          size and is what gets slashed on failure to deliver.
                        </Box>
                      }
                      arrow
                      placement="top"
                    >
                      <Box component="span">
                        {formatCollateral(miner.collateral)}
                      </Box>
                    </Tooltip>
                  </TableCell>

                  {!isMobile && (
                    <TableCell sx={cellSx} align="center">
                      {/* Dot only — the label lives in the tooltip. The full
                          text made this column wider than the dashboard's
                          narrow rates column and truncated the header. */}
                      <Tooltip title={status.label} arrow placement="left">
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            backgroundColor: status.color,
                            display: 'inline-block',
                          }}
                        />
                      </Tooltip>
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
