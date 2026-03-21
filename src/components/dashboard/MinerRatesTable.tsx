import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { COLORS, FONTS } from '../../theme';

interface Miner {
  uid: number;
  hotkey: string;
  sourceChain: string | null;
  destChain: string | null;
  rate: string | null;
  collateralRao: string;
  isActive: boolean;
  hasActiveSwap: boolean;
  updatedAt: string;
}

const statusDot = (miner: Miner) => {
  if (!miner.isActive) return { color: COLORS.textMuted, label: 'Inactive' };
  if (miner.hasActiveSwap) return { color: '#f59e0b', label: 'Swapping' };
  return { color: COLORS.primary, label: 'Available' };
};

const formatCollateral = (rao: string) => {
  const tao = parseInt(rao, 10) / 1e9;
  return tao.toFixed(2);
};

const shortAddr = (addr: string) =>
  addr.length > 10 ? `${addr.slice(0, 4)}..${addr.slice(-3)}` : addr;

const MinerRatesTable: React.FC = () => {
  const { data: miners = [] } = useQuery<Miner[]>({
    queryKey: ['miners'],
    queryFn: () => api.get('/miners').then((r) => r.data),
    refetchInterval: 30000,
  });

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{ mb: 2, fontFamily: FONTS.heading, fontWeight: 700 }}
      >
        Miner Rates
      </Typography>
      <TableContainer
        sx={{
          maxHeight: 500,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: COLORS.borderLight,
            borderRadius: 2,
          },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {['UID', 'Pair', 'Rate (TAO)', 'Capacity', 'Status', 'Hotkey'].map(
                (h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.65rem',
                      color: COLORS.textMuted,
                      borderBottom: `1px solid ${COLORS.border}`,
                      backgroundColor: COLORS.bg,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {h}
                  </TableCell>
                ),
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {miners.map((miner) => {
              const status = statusDot(miner);
              return (
                <TableRow
                  key={miner.uid}
                  sx={{
                    '&:hover': { backgroundColor: COLORS.surface },
                    transition: 'background-color 0.15s',
                  }}
                >
                  <TableCell
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.75rem',
                      color: COLORS.white,
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {miner.uid}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.75rem',
                      color: COLORS.textSecondary,
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {miner.sourceChain && miner.destChain
                      ? `${miner.sourceChain?.toUpperCase()}/${miner.destChain?.toUpperCase()}`
                      : '—'}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.75rem',
                      color: COLORS.primary,
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {miner.rate ? parseFloat(miner.rate).toFixed(2) : '—'}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.75rem',
                      color: COLORS.textSecondary,
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {formatCollateral(miner.collateralRao)} TAO
                  </TableCell>
                  <TableCell
                    sx={{ borderBottom: `1px solid ${COLORS.border}` }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: status.color,
                        }}
                      />
                      <Typography
                        sx={{
                          fontFamily: FONTS.mono,
                          fontSize: '0.7rem',
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.7rem',
                      color: COLORS.textMuted,
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {shortAddr(miner.hotkey)}
                  </TableCell>
                </TableRow>
              );
            })}
            {miners.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  sx={{
                    textAlign: 'center',
                    color: COLORS.textMuted,
                    borderBottom: 'none',
                    py: 4,
                  }}
                >
                  No miners registered
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
