import React from 'react';
import {
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useMinerLeaderboard } from '../../api';
import type { LeaderboardRow, Range } from '../../api';
import CrownIcon from './CrownIcon';
import { FONTS } from '../../theme';

const RANGES: Range[] = ['24h', '7d', '30d', '90d', 'all'];

const HOTKEY_SHORT = (h: string) => `${h.slice(0, 4)}…${h.slice(-4)}`;

const formatVolume = (raw: string): string => {
  const v = parseFloat(raw);
  if (!Number.isFinite(v) || v === 0) return '0.00 TAO';
  return `${v.toFixed(2)} TAO`;
};

const formatSuccess = (row: LeaderboardRow): string => {
  const total = row.completedSwaps + row.timedOutSwaps;
  if (total === 0) return '— / 0';
  return `${row.completedSwaps} / ${total}`;
};

const TIER_COLORS = [
  'primary.main',
  '#4d7dff',
  '#7f9eff',
  '#aebeff',
  '#d2dafe',
];

const MinerLeaderboard: React.FC<{
  activeHotkey?: string;
  range: Range;
  onRangeChange: (r: Range) => void;
}> = ({ activeHotkey, range, onRangeChange }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useMinerLeaderboard(range);
  const rows = data ?? [];
  const topShare = rows[0]?.crownShare ?? 0;

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
      <Table size="small" sx={{ '& th, & td': { borderColor: 'divider' } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 22, p: 0, pl: 1.5 }} />
            <TableCell>#</TableCell>
            <TableCell>uid</TableCell>
            <TableCell>hotkey</TableCell>
            <TableCell>crown share</TableCell>
            <TableCell>success</TableCell>
            <TableCell>volume</TableCell>
            <TableCell>active</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && !isLoading && (
            <TableRow>
              <TableCell
                colSpan={8}
                sx={{ textAlign: 'center', color: 'text.disabled' }}
              >
                No miners registered yet
              </TableCell>
            </TableRow>
          )}
          {rows.map((row, idx) => {
            const highlight = activeHotkey === row.hotkey;
            const sharePct =
              topShare > 0 ? Math.round((row.crownShare / topShare) * 100) : 0;
            const tierColor =
              TIER_COLORS[Math.min(idx, TIER_COLORS.length - 1)];
            const successColor =
              row.completedSwaps === 0 && row.timedOutSwaps > 0
                ? 'error.main'
                : 'text.primary';
            const wearsCrown = row.currentCrownDirections.length > 0;
            return (
              <TableRow
                key={row.hotkey}
                onClick={() => handleRowClick(row)}
                hover
                sx={{
                  cursor: 'pointer',
                  backgroundColor: highlight
                    ? 'rgba(0,82,255,0.07)'
                    : 'transparent',
                  '&:hover td': { backgroundColor: 'surface.elevated' },
                  '& td:first-of-type': highlight
                    ? { boxShadow: 'inset 2px 0 0 var(--color-primary)' }
                    : undefined,
                }}
              >
                <TableCell
                  sx={{ width: 22, p: 0, pl: 1.5, textAlign: 'center' }}
                >
                  {wearsCrown && <CrownIcon />}
                </TableCell>
                <TableCell sx={{ fontFamily: FONTS.mono }}>{idx + 1}</TableCell>
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
                  {formatVolume(row.volumeTao)}
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
