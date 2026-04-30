import React, { useMemo, useState } from 'react';
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
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
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
      return { color: theme.palette.status.fulfilled, label: 'Exchanging' };
    if (miner.isReserved)
      return { color: theme.palette.status.active, label: 'Reserved' };
    return { color: theme.palette.primary.main, label: 'Available' };
  };

  // Tighter horizontal padding than MUI's default (16px → 8px) so columns
  // get more breathing room before any content has to wrap.
  const headerSx = {
    fontFamily: FONTS.mono,
    fontSize: '0.65rem',
    color: theme.palette.text.secondary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    px: 1,
  };

  const cellSx = {
    fontFamily: FONTS.mono,
    fontSize: '0.75rem',
    borderBottom: `1px solid ${theme.palette.divider}`,
    px: 1,
  };

  // Fixed width for UID so 1/2/3-digit values don't reflow the column.
  const uidColSx = { width: 48, minWidth: 48 };

  // Rate cell sits a touch further from Pair so the two columns don't
  // visually fuse together; Capacity is centered in its column instead
  // of jamming left while the column itself is wide.
  const colOverrides: Partial<Record<SortKey, Record<string, unknown>>> = {
    uid: uidColSx,
    rate: { pl: 2 },
    collateral: { textAlign: 'center' },
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
    // Both rates are stored and shown as TAO per 1 unit of the non-TAO asset,
    // so the user reads a single unit ("TAO") and the spread between the two
    // rows is the network's margin.
    const tooltipLines: string[] = [];
    if (src && dst) {
      tooltipLines.push(
        forward > 0
          ? `${src} \u2192 ${dst}: ${forward.toFixed(2)} TAO per 1 ${src}`
          : `${src} \u2192 ${dst}: not quoted`,
      );
      tooltipLines.push(
        reverse > 0
          ? `${dst} \u2192 ${src}: ${reverse.toFixed(2)} TAO per 1 ${src}`
          : `${dst} \u2192 ${src}: not quoted`,
      );
    }
    // Dim the row whose direction is filtered out so the active rate is the
    // obvious one to read.
    const forwardDimmed = direction === 'reverse';
    const reverseDimmed = direction === 'forward';
    const labelSx = {
      color: theme.palette.text.secondary,
      fontSize: '0.65rem',
      letterSpacing: '0.03em',
    } as const;
    // τ glyph inherits the cell font size (no shrink) so it carries enough
    // visual weight to read as a unit suffix, just muted in color.
    const unitSx = {
      color: theme.palette.text.disabled,
    } as const;
    const renderRow = (
      from: string,
      to: string,
      value: number,
      dimmed: boolean,
      valueColor: string,
    ) => (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'baseline',
          opacity: dimmed ? 0.35 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        <Box component="span" sx={{ ...labelSx, mr: 1 }}>
          {from}
          {'\u2192'}
          {to}
        </Box>
        <Box
          component="span"
          sx={{
            color: value > 0 ? valueColor : disabled,
            display: 'inline-block',
            minWidth: 64,
            textAlign: 'center',
            // Tabular figures keep digit columns aligned across both rows
            // (so "99.00" and "100.50" line up vertically).
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatOr(value)}
        </Box>
        <Box component="span" sx={{ ...unitSx, ml: 0.25 }}>
          τ
        </Box>
      </Box>
    );
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
            flexDirection: 'column',
            gap: 0.25,
            fontFamily: FONTS.mono,
          }}
        >
          {src && dst ? (
            <>
              {renderRow(
                src,
                dst,
                forward,
                forwardDimmed,
                theme.palette.primary.main,
              )}
              {renderRow(
                dst,
                src,
                reverse,
                reverseDimmed,
                theme.palette.text.primary,
              )}
            </>
          ) : (
            <Box component="span" sx={{ color: disabled }}>
              {'\u2014'}
            </Box>
          )}
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
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            sx={{ fontFamily: FONTS.heading, fontWeight: 700 }}
          >
            Active Rates
          </Typography>
          <Tooltip
            title={
              <Stack spacing={0.5} sx={{ maxWidth: 280 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  What is this?
                </Typography>
                <Typography variant="body2">
                  Live exchange rates quoted across the Allways network. Each
                  row represents an active network node; both directions
                  (BTC→TAO and TAO→BTC) are shown when quoted, with the spread
                  between them being the network's margin.
                </Typography>
                <Typography variant="body2">
                  Sort by rate or capacity to find the best counterparty.
                </Typography>
              </Stack>
            }
            arrow
            placement="right"
          >
            <IconButton size="small" sx={{ p: 0, color: 'text.secondary' }}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

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
                position: 'relative',
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
                zIndex: 1,
                backgroundColor: `${theme.palette.primary.main}22 !important`,
                color: `${theme.palette.primary.main} !important`,
                borderColor: `${theme.palette.primary.main} !important`,
              },
              // MUI collapses adjacent button borders via marginLeft: -1px,
              // so a selected non-last button's right edge gets covered by
              // the next button's transparent left border. Recolor the seam.
              '& .Mui-selected + .MuiToggleButton-root': {
                borderLeftColor: `${theme.palette.primary.main} !important`,
              },
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="both">{'\u21C4'} Both</ToggleButton>
            <ToggleButton value="forward">BTC {'\u2192'} TAO</ToggleButton>
            <ToggleButton value="reverse">TAO {'\u2192'} BTC</ToggleButton>
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
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  sx={{ ...headerSx, ...(colOverrides[col.key] ?? {}) }}
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
                  <TableCell
                    sx={{ ...cellSx, ...uidColSx, color: 'text.primary' }}
                  >
                    {miner.uid}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, color: 'text.secondary' }}>
                    {renderPairCell(miner)}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, ...(colOverrides.rate ?? {}) }}>
                    {renderRateCell(miner)}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...cellSx,
                      ...(colOverrides.collateral ?? {}),
                      color: 'text.secondary',
                    }}
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
                          Total TAO collateral backing this network node on the
                          contract. Caps the size of exchanges they can fulfill
                          — higher collateral means more exchange capacity, and
                          is what gets slashed if they fail to deliver.
                        </Box>
                      }
                      arrow
                      placement="top"
                    >
                      <Box component="span">
                        {formatCollateral(miner.collateralRao)}
                        <Box
                          component="span"
                          sx={{ color: theme.palette.text.disabled, ml: 0.5 }}
                        >
                          τ
                        </Box>
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell
                    sx={{
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      px: 1,
                    }}
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
                    ? 'No network nodes match the current filter'
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
