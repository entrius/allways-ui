import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  useMinerLeaderboard,
  type LeaderboardRow,
  type Range,
} from '../../api';
import CrownIcon from './CrownIcon';
import SortHeader, { type SortDir } from './SortHeader';
import { FONTS } from '../../theme';
import { formatTao, shortHotkey } from '../../utils/format';

// 1h is the live scoring window (SCORING_WINDOW_BLOCKS) and the default view.
// 30d is the deepest window; the API clamps everything to ~30d
// (MAX_LOOKBACK_BLOCKS) so crown_holders stays prunable, which made the old
// 90d/all chips return identical data to 30d.
const RANGES: Range[] = ['1h', '24h', '7d', '30d'];

const formatVolume = (raw: string): string => {
  const v = parseFloat(raw);
  if (!Number.isFinite(v) || v === 0) return '0.00';
  return v.toFixed(2);
};

const formatSuccess = (row: LeaderboardRow): string => {
  const total = row.completedSwaps + row.timedOutSwaps;
  if (total === 0) return '— / 0';
  return `${row.completedSwaps} / ${total}`;
};

const successRatio = (row: LeaderboardRow): number => {
  const total = row.completedSwaps + row.timedOutSwaps;
  return total === 0 ? 0 : row.completedSwaps / total;
};

const TIER_COLORS = [
  'primary.main',
  '#4d7dff',
  '#7f9eff',
  '#aebeff',
  '#d2dafe',
];

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
): number => {
  switch (key) {
    case 'uid':
      return a.uid - b.uid;
    case 'crownShare':
      return a.crownShare - b.crownShare;
    case 'collateral':
      return parseFloat(a.collateralRao) - parseFloat(b.collateralRao);
    case 'success':
      return successRatio(a) - successRatio(b);
    case 'volume':
      return parseFloat(a.volumeTao) - parseFloat(b.volumeTao);
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
  const [sortKey, setSortKey] = useState<SortKey>('crownShare');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [query, setQuery] = useState('');

  const baseRows = useMemo(() => data ?? [], [data]);
  const topShare = useMemo(
    () => Math.max(0, ...baseRows.map((r) => r.crownShare)),
    [baseRows],
  );

  const tierByHotkey = useMemo(() => {
    // Crown-share-desc tier coloring stays stable regardless of active sort —
    // tier is a property of the miner's standing, not the table view order.
    const ranked = [...baseRows].sort((a, b) => b.crownShare - a.crownShare);
    const map = new Map<string, string>();
    ranked.forEach((row, idx) => {
      map.set(row.hotkey, TIER_COLORS[Math.min(idx, TIER_COLORS.length - 1)]);
    });
    return map;
  }, [baseRows]);

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
    return [...filteredRows].sort((a, b) => sign * compare(a, b, sortKey));
  }, [filteredRows, sortKey, sortDir]);

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
        backgroundColor: 'surface.light',
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
        <Typography
          variant="monoSmall"
          sx={{
            fontSize: '0.7rem',
            letterSpacing: '0.22em',
            color: 'text.secondary',
          }}
        >
          Miner Leaderboard
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <TextField
            size="small"
            placeholder="search uid or hotkey…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            inputProps={{
              style: {
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                padding: '5px 9px',
              },
            }}
            sx={{
              width: { xs: '100%', sm: 200 },
              '& .MuiOutlinedInput-root': { backgroundColor: 'surface.main' },
              '& fieldset': { borderColor: 'divider' },
            }}
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
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {RANGES.map((r) => (
              <Button
                key={r}
                size="small"
                variant={r === range ? 'contained' : 'outlined'}
                onClick={() => onRangeChange(r)}
                sx={{
                  // Fill the row evenly on mobile (own line); natural width on desktop.
                  flex: { xs: 1, sm: 'none' },
                  minWidth: 0,
                  px: 1.25,
                  py: 0.5,
                  fontFamily: FONTS.mono,
                  fontSize: '0.65rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  borderColor: 'divider',
                }}
              >
                {r}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Stack>
      <Box sx={{ overflowX: 'auto', mx: { xs: -1.5, md: 0 } }}>
        <Table
          size="small"
          sx={{
            minWidth: { xs: 480, md: 0 },
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
              <SortHeader
                label={SORT_LABELS.collateral}
                sortKey="collateral"
                active={sortKey}
                dir={sortDir}
                onSort={onSort}
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
              const tierColor = tierByHotkey.get(row.hotkey) ?? TIER_COLORS[4];
              const successColor =
                row.completedSwaps === 0 && row.timedOutSwaps > 0
                  ? 'error.main'
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
                    '&:hover td': { backgroundColor: 'surface.elevated' },
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
                    {row.uid}
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
                  <TableCell sx={{ fontFamily: FONTS.mono }}>
                    {formatTao(row.collateralRao)} τ
                  </TableCell>
                  <TableCell
                    sx={{ fontFamily: FONTS.mono, color: successColor }}
                  >
                    {formatSuccess(row)}
                  </TableCell>
                  <TableCell sx={{ fontFamily: FONTS.mono }}>
                    {formatVolume(row.volumeTao)} τ
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
