import React, { useMemo, useState } from 'react';
import {
  Box,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  useMinerLeaderboard,
  useUsdPrices,
  type LeaderboardRow,
  type Range,
} from '../../api';
import CrownIcon from './CrownIcon';
import RangeChips from '../RangeChips';
import SearchField from '../SearchField';
import SectionHeading from '../SectionHeading';
import SortHeader, { type SortDir } from './SortHeader';
import { tierPalette } from './crownGridCells';
import { MOVE_COLORS } from '../dashboard/AllwaysMarketRate';
import { FONTS } from '../../theme';
import {
  backingEntries,
  backingTooltip,
  chainSymbol,
  formatSol,
  formatUsd,
  shortHotkey,
  usdFromBackingMap,
  type UsdPrices,
} from '../../utils/format';

// 1h is the live scoring window (SCORING_WINDOW_SECS) and the default view.
// 30d is the deepest window; the API clamps everything to ~30d
// (MAX_LOOKBACK_SECS) so crown_holders stays prunable, which made the old
// 90d/all chips return identical data to 30d.
const RANGES: Range[] = ['1h', '24h', '7d', '30d'];

const formatSuccess = (row: LeaderboardRow): string => {
  const total = row.completedSwaps + row.timedOutSwaps;
  if (total === 0) return '— / 0';
  return `${row.completedSwaps} / ${total}`;
};

const successRatio = (row: LeaderboardRow): number => {
  const total = row.completedSwaps + row.timedOutSwaps;
  return total === 0 ? 0 : row.completedSwaps / total;
};

type SortKey =
  | 'uid'
  | 'crownShare'
  | 'collateral'
  | 'success'
  | 'volume'
  | 'active';

const SORT_LABELS: Record<SortKey, string> = {
  uid: 'uid',
  crownShare: 'crown share',
  collateral: 'collateral',
  success: 'success',
  volume: 'volume',
  active: 'active',
};

const compare = (
  a: LeaderboardRow,
  b: LeaderboardRow,
  key: SortKey,
  prices: UsdPrices,
): number => {
  switch (key) {
    case 'uid':
      // null uids (unregistered hotkeys) sort after every real uid.
      return (a.uid ?? Infinity) - (b.uid ?? Infinity);
    case 'crownShare':
      return a.crownShare - b.crownShare;
    case 'collateral':
      return parseFloat(a.collateral) - parseFloat(b.collateral);
    case 'success':
      return successRatio(a) - successRatio(b);
    case 'volume': {
      // Estimated USD ranks across backings; the SOL scalar alone
      // under-ranks TAO-heavy miners. Falls back when prices are down.
      const aUsd = usdFromBackingMap(a.volumeByBacking, prices, a.volumeSol);
      const bUsd = usdFromBackingMap(b.volumeByBacking, prices, b.volumeSol);
      if (aUsd != null && bUsd != null) return aUsd - bUsd;
      return parseFloat(a.volumeSol) - parseFloat(b.volumeSol);
    }
    case 'active':
      return Number(a.isActive) - Number(b.isActive);
  }
};

const MinerLeaderboard: React.FC<{
  range: Range;
  onRangeChange: (r: Range) => void;
}> = ({ range, onRangeChange }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { data, isLoading } = useMinerLeaderboard(range);
  const prices = useUsdPrices();
  const [sortKey, setSortKey] = useState<SortKey>('crownShare');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [query, setQuery] = useState('');

  const baseRows = useMemo(() => data ?? [], [data]);
  const topShare = useMemo(
    () => Math.max(0, ...baseRows.map((r) => r.crownShare)),
    [baseRows],
  );

  // Monochrome opacity ramp like the Network Stats pair-mix bars — no fixed
  // accent color for data encodings.
  const tierColors = useMemo(
    () => tierPalette(theme.palette.text.primary),
    [theme.palette.text.primary],
  );
  const tierByHotkey = useMemo(() => {
    // Crown-share-desc tier coloring stays stable regardless of active sort —
    // tier is a property of the miner's standing, not the table view order.
    const ranked = [...baseRows].sort((a, b) => b.crownShare - a.crownShare);
    const map = new Map<string, string>();
    ranked.forEach((row, idx) => {
      map.set(row.hotkey, tierColors[Math.min(idx, tierColors.length - 1)]);
    });
    return map;
  }, [baseRows, tierColors]);

  // Numeric query → exact uid match (typing "3" shouldn't surface uid 30,
  // 31, ...). Anything non-numeric falls through to hotkey substring.
  const queryRaw = query.trim();
  const queryNorm = queryRaw.toLowerCase();
  const numericQuery = /^\d+$/.test(queryRaw);
  const filteredRows = useMemo(() => {
    if (!queryNorm) return baseRows;
    if (numericQuery) {
      return baseRows.filter((row) => String(row.uid) === queryRaw);
    }
    return baseRows.filter((row) =>
      row.hotkey.toLowerCase().includes(queryNorm),
    );
  }, [baseRows, queryNorm, queryRaw, numericQuery]);

  const sortedRows = useMemo(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filteredRows].sort(
      (a, b) => sign * compare(a, b, sortKey, prices),
    );
  }, [filteredRows, sortKey, sortDir, prices]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'active' ? 'asc' : 'desc');
    }
  };

  const handleRowClick = (row: LeaderboardRow) => {
    navigate(`/miners/${row.hotkey}`);
  };

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        p: { xs: 1.5, md: 2.5 },
        mb: 4,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={{ mb: 1.5 }}
      >
        <SectionHeading
          title="Miner Leaderboard"
          subtitle="crown share, collateral and volume per miner"
        />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="UID or hotkey..."
            ariaLabel="Search miners"
            sx={{ width: { xs: '100%', sm: 200 } }}
          />
          {queryNorm && (
            <Typography
              variant="mono"
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.65rem',
                color: 'text.disabled',
                whiteSpace: 'nowrap',
              }}
            >
              {filteredRows.length} of {baseRows.length} shown
            </Typography>
          )}
          <RangeChips value={range} options={RANGES} onChange={onRangeChange} />
        </Stack>
      </Stack>
      <Box sx={{ overflowX: 'auto', mx: { xs: -1.5, md: 0 } }}>
        <Table
          size="small"
          sx={{
            // Columns fold below sm instead of forcing a sideways scroll.
            minWidth: 0,
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
              <TableCell sx={{ width: 22, p: 0, pl: 1.5 }} />
              <SortHeader
                label={SORT_LABELS.uid}
                sortKey="uid"
                active={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                hotkey
              </TableCell>
              <SortHeader
                label={SORT_LABELS.crownShare}
                sortKey="crownShare"
                active={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              {/* Collateral and volume fold away below sm so phones read
                  uid · crown share · success · active without a sideways
                  scroll. */}
              <SortHeader
                label={SORT_LABELS.collateral}
                sortKey="collateral"
                active={sortKey}
                dir={sortDir}
                onSort={onSort}
                sx={{ display: { xs: 'none', sm: 'table-cell' } }}
              />
              <SortHeader
                label={SORT_LABELS.success}
                sortKey="success"
                active={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortHeader
                label={SORT_LABELS.volume}
                sortKey="volume"
                active={sortKey}
                dir={sortDir}
                onSort={onSort}
                sx={{ display: { xs: 'none', sm: 'table-cell' } }}
              />
              <SortHeader
                label={SORT_LABELS.active}
                sortKey="active"
                active={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Initial load only — refetches keep the previous rows visible
                (keepPreviousData), so skeletons never flash over real data. */}
            {isLoading &&
              sortedRows.length === 0 &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell sx={{ width: 22, p: 0, pl: 1.5 }} />
                  <TableCell>
                    <Skeleton
                      variant="text"
                      width={28}
                      sx={{ borderRadius: 0 }}
                    />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Skeleton
                      variant="text"
                      width={90}
                      sx={{ borderRadius: 0 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Skeleton
                      variant="text"
                      width={110}
                      sx={{ borderRadius: 0 }}
                    />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Skeleton
                      variant="text"
                      width={72}
                      sx={{ borderRadius: 0 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Skeleton
                      variant="text"
                      width={48}
                      sx={{ borderRadius: 0 }}
                    />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Skeleton
                      variant="text"
                      width={64}
                      sx={{ borderRadius: 0 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Skeleton
                      variant="text"
                      width={40}
                      sx={{ borderRadius: 0 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            {sortedRows.length === 0 && !isLoading && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  sx={{ textAlign: 'center', color: 'text.disabled' }}
                >
                  No miners registered yet
                </TableCell>
              </TableRow>
            )}
            {sortedRows.map((row) => {
              const sharePct =
                topShare > 0
                  ? Math.round((row.crownShare / topShare) * 100)
                  : 0;
              const tierColor = tierByHotkey.get(row.hotkey) ?? tierColors[4];
              const successColor =
                row.completedSwaps === 0 && row.timedOutSwaps > 0
                  ? MOVE_COLORS[theme.palette.mode].down
                  : 'text.primary';
              const wearsCrown = row.currentCrownDirections.length > 0;
              return (
                <TableRow
                  key={row.hotkey}
                  onClick={() => handleRowClick(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(row);
                    }
                  }}
                  tabIndex={0}
                  hover
                  sx={{
                    cursor: 'pointer',
                    '&:hover td': { backgroundColor: 'action.hover' },
                    '&:focus-visible': {
                      outline: `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: -2,
                    },
                  }}
                >
                  <TableCell
                    sx={{ width: 22, p: 0, pl: 1.5, textAlign: 'center' }}
                  >
                    {wearsCrown && <CrownIcon />}
                  </TableCell>
                  <TableCell sx={{ fontFamily: FONTS.mono }}>
                    {row.uid ?? '—'}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: FONTS.mono,
                      display: { xs: 'none', md: 'table-cell' },
                    }}
                  >
                    {shortHotkey(row.hotkey)}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1.25}>
                      <Box
                        sx={{
                          display: 'inline-block',
                          width: 80,
                          height: 6,
                          backgroundColor: 'action.hover',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${sharePct}%`,
                            backgroundColor: tierColor,
                          }}
                        />
                      </Box>
                      <Typography
                        sx={{
                          fontFamily: FONTS.mono,
                          fontSize: { xs: '0.72rem', md: '0.85rem' },
                        }}
                      >
                        {(row.crownShare * 100).toFixed(0)}%
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: FONTS.mono,
                      display: { xs: 'none', sm: 'table-cell' },
                    }}
                  >
                    {formatSol(row.collateral)} SOL
                  </TableCell>
                  <TableCell
                    sx={{ fontFamily: FONTS.mono, color: successColor }}
                  >
                    {formatSuccess(row)}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: FONTS.mono,
                      display: { xs: 'none', sm: 'table-cell' },
                    }}
                  >
                    {(() => {
                      const usd = usdFromBackingMap(
                        row.volumeByBacking,
                        prices,
                        row.volumeSol,
                      );
                      return usd != null ? (
                        <span
                          title={backingTooltip(
                            row.volumeByBacking,
                            row.volumeSol,
                          )}
                        >
                          {formatUsd(usd)}
                        </span>
                      ) : (
                        backingEntries(row.volumeByBacking, row.volumeSol)
                          .map((e) => `${e.amount} ${chainSymbol(e.chain)}`)
                          .join(' + ')
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: row.isActive
                          ? 'status.active'
                          : 'text.disabled',
                        display: 'inline-block',
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};

export default MinerLeaderboard;
