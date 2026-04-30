import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useChainState, useMiners, useReservations } from '../../api';
import type { Miner, Reservation } from '../../api/models';
import { FONTS } from '../../theme';
import { formatAmount, formatTimeUntilBlock } from '../../utils/format';

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
  const reservations = data ?? [];
  const colors = STATUS_COLORS(theme.palette);
  const currentBlock = chainState?.currentBlock ?? 0;

  const [searchAddr, setSearchAddr] = useState('');

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
        <Box
          component="form"
          onSubmit={submitSearch}
          sx={{ minWidth: { sm: 280 } }}
        >
          <TextField
            value={searchAddr}
            onChange={(e) => setSearchAddr(e.target.value)}
            placeholder="Find your reservations by source address"
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
        </Box>
      </Stack>

      {isLoading && (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color: 'text.secondary',
          }}
        >
          Loading…
        </Typography>
      )}

      {!isLoading && reservations.length === 0 && (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color: 'text.secondary',
          }}
        >
          No reservations yet.
        </Typography>
      )}

      <Stack spacing={0.75} sx={{ overflowY: 'auto', pr: 0.5 }}>
        {reservations.map((r: Reservation) => {
          const statusColor = colors[r.status] ?? colors.ACTIVE;
          const sendLabel =
            r.fromAmount && r.fromChain
              ? formatAmount(r.fromAmount, r.fromChain)
              : '—';
          const recvLabel =
            r.toAmount && r.toChain ? formatAmount(r.toAmount, r.toChain) : '—';
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
              key={r.requestHash}
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
      </Stack>
    </Stack>
  );
};

export default ReservationsTracker;
