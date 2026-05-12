import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  useChainState,
  useMiners,
  useProtocolConstants,
  useReservations,
} from '../../api';
import type { Miner, Reservation } from '../../api/models';
import { FONTS } from '../../theme';
import {
  applyFee,
  formatAmount,
  formatTimeUntilBlock,
} from '../../utils/format';
import { ReservationsTrackerSkeleton } from './Skeletons';

const STATUS_COLORS = (palette: {
  status: { active: string; fulfilled: string; timedOut: string };
}): Record<string, string> => ({
  ACTIVE: palette.status.active,
  INITIATED: palette.status.fulfilled,
  EXPIRED: palette.status.timedOut,
  CANCELLED: palette.status.timedOut,
});

const ReservationsTracker: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data, isLoading } = useReservations();
  const { data: miners } = useMiners();
  const { data: chainState } = useChainState();
  const { data: protocol } = useProtocolConstants();
  const [searchAddr, setSearchAddr] = useState('');
  const reservations = data ?? [];
  const colors = STATUS_COLORS(theme.palette);
  const currentBlock = chainState?.currentBlock ?? 0;

  if (isLoading && !data) {
    return <ReservationsTrackerSkeleton />;
  }

  // Only show reservations that are still holding a miner. INITIATED have
  // become swaps (visible in Transactions); EXPIRED/CANCELLED are history.
  const active = reservations.filter((r: Reservation) => r.status === 'ACTIVE');
  const trimmed = searchAddr.trim().toLowerCase();
  const filtered = trimmed
    ? active.filter((r: Reservation) =>
        r.userFromAddress?.toLowerCase().includes(trimmed),
      )
    : active;
  const visible = filtered.slice(0, 3);
  const hiddenCount = filtered.length - visible.length;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const addr = searchAddr.trim();
    if (addr) navigate(`/reservations/by-source/${addr}`);
  };

  const minerUid = (hotkey: string): number | undefined =>
    miners?.find((m: Miner) => m.hotkey === hotkey)?.uid;

  return (
    <Stack spacing={1.5} sx={{ height: '100%' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1, sm: 2 }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            Reservations
          </Typography>
          <Tooltip
            title={
              <Box sx={{ maxWidth: 260 }}>
                A short hold a user places on a miner's quoted rate before
                sending funds. The reservation locks the rate and prevents other
                users from claiming the same miner mid-swap.
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
          component="form"
          onSubmit={submitSearch}
          sx={{ width: { xs: '100%', sm: 420 } }}
        >
          <TextField
            value={searchAddr}
            onChange={(e) => setSearchAddr(e.target.value)}
            placeholder="Filter by source address"
            size="small"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    type="submit"
                    size="small"
                    aria-label="search"
                    sx={{ color: 'text.secondary' }}
                  >
                    <SearchIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                fontFamily: FONTS.mono,
                fontSize: '0.75rem',
                borderRadius: 0,
              },
            }}
          />
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              color: 'text.secondary',
              mt: 0.5,
            }}
          >
            Filters live as you type. Press enter to see all matches.
          </Typography>
        </Box>
      </Stack>

      {filtered.length === 0 && (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color: 'text.secondary',
          }}
        >
          {trimmed
            ? 'No active reservations match that address.'
            : 'No active reservations.'}
        </Typography>
      )}

      <Stack spacing={0.75}>
        {visible.map((r: Reservation) => {
          const statusColor = colors[r.status] ?? colors.ACTIVE;
          const sendLabel =
            r.fromAmount && r.fromChain
              ? formatAmount(r.fromAmount, r.fromChain)
              : '—';
          const netRecv = applyFee(r.toAmount, protocol?.feeDivisor);
          const recvLabel =
            netRecv && r.toChain ? formatAmount(netRecv, r.toChain) : '—';
          const uid = minerUid(r.minerHotkey);
          const minerLabel =
            uid !== undefined ? `UID ${uid}` : `${r.minerHotkey.slice(0, 6)}…`;
          const remaining =
            r.status === 'ACTIVE' && currentBlock > 0
              ? formatTimeUntilBlock(
                  parseInt(r.reservedUntilBlock, 10),
                  currentBlock,
                )
              : null;
          return (
            <Box
              key={r.id}
              component={RouterLink}
              to={`/reservations/${r.requestHash}`}
              sx={{
                p: 1.25,
                borderRadius: 0,
                border: '1px solid',
                borderColor: 'divider',
                textDecoration: 'none',
                display: 'block',
                transition: 'border-color 0.15s, background-color 0.15s',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'background.paper',
                },
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={{ xs: 0.25, sm: 1 }}
              >
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.75rem',
                    color: 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Send {sendLabel} → Receive {recvLabel}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: statusColor,
                    flexShrink: 0,
                  }}
                >
                  {r.status}
                </Typography>
              </Stack>
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.65rem',
                  color: 'text.secondary',
                  mt: 0.25,
                }}
              >
                miner {minerLabel} · until #{r.reservedUntilBlock}
                {remaining ? ` (${remaining} left)` : ''}
                {r.swapId ? ` · swap #${r.swapId}` : ''}
              </Typography>
            </Box>
          );
        })}
        {hiddenCount > 0 && trimmed && (
          <Typography
            component={RouterLink}
            to={`/reservations/by-source/${searchAddr.trim()}`}
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              color: 'text.secondary',
              textDecoration: 'none',
              alignSelf: 'flex-start',
              mt: 0.25,
              '&:hover': { color: 'primary.main' },
            }}
          >
            +{hiddenCount} more →
          </Typography>
        )}
      </Stack>
    </Stack>
  );
};

export default ReservationsTracker;
