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
  formatRateLine,
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

const ReservationsTracker: React.FC<{ embedded?: boolean }> = ({
  embedded,
}) => {
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
        {!embedded && (
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
                  sending funds. The reservation locks the rate and prevents
                  other users from claiming the same miner mid-swap.
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
        )}
        <Box
          component="form"
          onSubmit={submitSearch}
          sx={{ width: embedded ? '100%' : { xs: '100%', sm: 420 } }}
        >
          <TextField
            value={searchAddr}
            onChange={(e) => setSearchAddr(e.target.value)}
            placeholder="Search by source address"
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
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

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.border.light,
            borderRadius: 0,
          },
        }}
      >
        <Stack spacing={0}>
          {filtered.map((r: Reservation) => {
            const statusColor = colors[r.status] ?? colors.ACTIVE;
            const sendLabel =
              r.fromAmount && r.fromChain
                ? formatAmount(r.fromAmount, r.fromChain)
                : '—';
            const netRecv = applyFee(r.toAmount, protocol?.feeDivisor);
            const recvLabel =
              netRecv && r.toChain ? formatAmount(netRecv, r.toChain) : '—';
            // Locked rate from the on-chain amounts (gross), quoted in TAO.
            const rateLine = formatRateLine(
              r.fromAmount,
              r.fromChain,
              r.toAmount,
              r.toChain,
            );
            const uid = minerUid(r.minerHotkey);
            const minerLabel =
              uid !== undefined
                ? `UID ${uid}`
                : `${r.minerHotkey.slice(0, 6)}…`;
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
                  px: 1,
                  py: { xs: 1.75, sm: 1.25 },
                  borderRadius: 0,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                  '&:hover': { backgroundColor: 'action.hover' },
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
                      fontSize: { xs: '0.72rem', sm: '0.8rem' },
                      fontWeight: 600,
                      color: 'text.primary',
                      // Wrap on mobile (it's full-width there) so the amounts
                      // stay legible instead of spilling past the card.
                      width: { xs: '100%', sm: 'auto' },
                      whiteSpace: { xs: 'normal', sm: 'nowrap' },
                      overflow: { sm: 'hidden' },
                      textOverflow: { sm: 'ellipsis' },
                    }}
                  >
                    {sendLabel}
                    <Box
                      component="span"
                      sx={{ color: 'text.secondary', mx: 0.5, fontWeight: 400 }}
                    >
                      →
                    </Box>
                    {recvLabel}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: { xs: '0.58rem', sm: '0.65rem' },
                      fontWeight: 600,
                      color: statusColor,
                      flexShrink: 0,
                    }}
                  >
                    {r.status}
                  </Typography>
                </Stack>
                {rateLine && (
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: { xs: '0.6rem', sm: '0.68rem' },
                      color: 'text.primary',
                      mt: 0.25,
                    }}
                  >
                    {rateLine}
                  </Typography>
                )}
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: { xs: '0.58rem', sm: '0.65rem' },
                    color: 'text.secondary',
                    mt: 0.25,
                  }}
                >
                  {minerLabel} · until #{r.reservedUntilBlock}
                  {remaining ? ` (${remaining} left)` : ''}
                  {r.swapId ? ` · swap #${r.swapId}` : ''}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Stack>
  );
};

export default ReservationsTracker;
