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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  useMinerLeaderboard,
  type LeaderboardRow,
  type Range,
} from '../../api';
import CrownIcon from './CrownIcon';
import { FONTS } from '../../theme';

const RANGES: Range[] = ['24h', '7d', '30d', '90d', 'all'];

const HOTKEY_SHORT = (h: string) => `${h.slice(0, 4)}…${h.slice(-4)}`;

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

type SortKey = 'uid' | 'crownShare' | 'success' | 'volume' | 'active';
type SortDir = 'asc' | 'desc';

const SORT_LABELS: Record<SortKey, string> = {
  uid: 'uid',
  crownShare: 'crown share',
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
    case 'success':
      return successRatio(a) - successRatio(b);
    case 'volume':
      return parseFloat(a.volumeTao) - parseFloat(b.volumeTao);
    case 'active':
      return Number(a.isActive) - Number(b.isActive);
  }
};

const SortHeader: React.FC<{
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}> = ({ label, sortKey, active, dir, onSort }) => {
  const isActive = active === sortKey;
  return (
    <TableCell
      onClick={() => onSort(sortKey)}
      sx={{
        cursor: 'pointer',
        userSelect: 'none',
        color: isActive ? 'text.primary' : undefined,
        '&:hover': { color: 'text.primary' },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <span>{label}</span>
        <Box
          component="span"
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.65rem',
            color: isActive ? 'primary.main' : 'text.disabled',
            opacity: isActive ? 1 : 0.4,
          }}
        >
          {isActive ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </Box>
      </Stack>
    </TableCell>
  );
};

const MinerLeaderboard: React.FC<{
  range: Range;
  onRangeChange: (r: Range) => void;
}> = ({ range, onRangeChange }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useMinerLeaderboard(range);
  const [sortKey, setSortKey] = useState<SortKey>('crownShare');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [query, setQuery] = useState('');

  const baseRows = data ?? [];
  const topShare = useMemo(
    () => Math.max(0, ...baseRows.map((r) => r.crownShare)),
    [baseRows],
  );

  const sortedRows = useMemo(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...baseRows].sort((a, b) => sign * compare(a, b, sortKey));
  }, [baseRows, sortKey, sortDir]);

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

  const queryNorm = query.trim().toLowerCase();
  const matches = (row: LeaderboardRow): boolean => {
    if (!queryNorm) return false;
    if (String(row.uid) === queryNorm) return true;
    return row.hotkey.toLowerCase().includes(queryNorm);
  };

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      // Smart default per column: numeric columns default desc, active flag asc
      setSortDir(key === 'active' ? 'asc' : 'desc');
    }
  };

  const handleRowClick = (row: LeaderboardRow) => {
    navigate(`/miners/${row.hotkey}`);
    try {
      const RAW = localStorage.getItem('allways.recentMiners');
      const parsed: { uid: number; hotkey: string; viewedAt: number }[] = RAW
        ? JSON.parse(RAW)
        : [];
      const next = [
        { uid: row.uid, hotkey: row.hotkey, viewedAt: Date.now() },
        ...parsed.filter((m) => m.hotkey !== row.hotkey),
      ].slice(0, 5);
      localStorage.setItem('allways.recentMiners', JSON.stringify(next));
    } catch {
      /* ignore — storage disabled */
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: 'surface.light',
        border: '1px solid',
        borderColor: 'divider',
        p: 2.5,
        mb: 4,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
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
        <Stack direction="row" spacing={1} alignItems="center">
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
              width: 200,
              '& .MuiOutlinedInput-root': { backgroundColor: 'surface.main' },
              '& fieldset': { borderColor: 'divider' },
            }}
          />
          <Stack direction="row" spacing={0.5}>
            {RANGES.map((r) => (
              <Button
                key={r}
                size="small"
                variant={r === range ? 'contained' : 'outlined'}
                onClick={() => onRangeChange(r)}
                sx={{
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
      <Table size="small" sx={{ '& th, & td': { borderColor: 'divider' } }}>
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
            <TableCell>hotkey</TableCell>
            <SortHeader
              label={SORT_LABELS.crownShare}
              sortKey="crownShare"
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
                colSpan={7}
                sx={{ textAlign: 'center', color: 'text.disabled' }}
              >
                No miners registered yet
              </TableCell>
            </TableRow>
          )}
          {sortedRows.map((row) => {
            const sharePct =
              topShare > 0 ? Math.round((row.crownShare / topShare) * 100) : 0;
            const tierColor = tierByHotkey.get(row.hotkey) ?? TIER_COLORS[4];
            const successColor =
              row.completedSwaps === 0 && row.timedOutSwaps > 0
                ? 'error.main'
                : 'text.primary';
            const wearsCrown = row.currentCrownDirections.length > 0;
            const matched = matches(row);
            return (
              <TableRow
                key={row.hotkey}
                onClick={() => handleRowClick(row)}
                hover
                sx={{
                  cursor: 'pointer',
                  backgroundColor: matched
                    ? 'rgba(0,82,255,0.08)'
                    : 'transparent',
                  borderLeft: matched ? '2px solid' : '2px solid transparent',
                  borderLeftColor: matched ? 'primary.main' : 'transparent',
                  '&:hover td': { backgroundColor: 'surface.elevated' },
                }}
              >
                <TableCell
                  sx={{ width: 22, p: 0, pl: 1.5, textAlign: 'center' }}
                >
                  {wearsCrown && <CrownIcon />}
                </TableCell>
                <TableCell sx={{ fontFamily: FONTS.mono }}>{row.uid}</TableCell>
                <TableCell sx={{ fontFamily: FONTS.mono }}>
                  {HOTKEY_SHORT(row.hotkey)}
                </TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Box
                      sx={{
                        display: 'inline-block',
                        width: 80,
                        height: 6,
                        backgroundColor: 'rgba(255,255,255,0.05)',
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
                      sx={{ fontFamily: FONTS.mono, fontSize: '0.85rem' }}
                    >
                      {(row.crownShare * 100).toFixed(0)}%
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontFamily: FONTS.mono, color: successColor }}>
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
  );
};

export default MinerLeaderboard;
