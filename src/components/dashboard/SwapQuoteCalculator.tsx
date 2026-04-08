import React, { useMemo, useState } from 'react';
import {
  Box,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useMiners, type Miner } from '../../api';
import { FONTS } from '../../theme';
import CopyableAddress from '../CopyableAddress';
import { SwapQuoteCalculatorSkeleton } from './Skeletons';

type Direction = 'btcToTao' | 'taoToBtc';

const FEE_RATE = 0.01;

const DIRECTION_CONFIG: Record<
  Direction,
  { from: string; to: string; fromSymbol: string; toSymbol: string }
> = {
  btcToTao: { from: 'btc', to: 'tao', fromSymbol: 'BTC', toSymbol: 'TAO' },
  taoToBtc: { from: 'tao', to: 'btc', fromSymbol: 'TAO', toSymbol: 'BTC' },
};

interface QuoteRow {
  uid: number;
  hotkey: string;
  rate: number;
  receiveGross: number;
  fee: number;
  receiveNet: number;
  capacityTao: number;
  isBestRate: boolean;
  exceedsCapacity: boolean;
}

const computeTaoExposure = (
  parsedAmount: number,
  rate: number,
  direction: Direction,
): number => {
  if (direction === 'btcToTao') {
    return parsedAmount * rate * (1 - FEE_RATE);
  }
  return parsedAmount;
};

const computeSavings = (quotes: QuoteRow[]): number | null => {
  if (quotes.length < 2) return null;
  return quotes[0].receiveNet - quotes[quotes.length - 1].receiveNet;
};

const resolveRate = (miner: Miner, direction: Direction): number | null => {
  const s = miner.sourceChain?.toLowerCase();
  const isBtcSource = s === 'btc';

  if (direction === 'btcToTao') {
    const raw = isBtcSource ? miner.rate : miner.counterRate;
    if (!raw) return null;
    const val = parseFloat(raw);
    return isNaN(val) || val <= 0 ? null : val;
  }

  const raw = isBtcSource ? miner.counterRate : miner.rate;
  if (!raw) return null;
  const val = parseFloat(raw);
  return isNaN(val) || val <= 0 ? null : val;
};

const formatReceive = (amount: number, direction: Direction): string => {
  if (direction === 'btcToTao') {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 6,
    maximumFractionDigits: 8,
  });
};

const SwapQuoteCalculator: React.FC = () => {
  const theme = useTheme();
  const { data: miners, isLoading } = useMiners();
  const [direction, setDirection] = useState<Direction>('btcToTao');
  const [amountStr, setAmountStr] = useState('');

  const config = DIRECTION_CONFIG[direction];
  const parsedAmount = parseFloat(amountStr);
  const hasValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const quotes = useMemo((): QuoteRow[] => {
    if (!miners?.length || isNaN(parsedAmount) || parsedAmount <= 0) return [];

    const rows: QuoteRow[] = [];

    for (const miner of miners) {
      if (!miner.isActive) continue;
      const s = miner.sourceChain?.toLowerCase();
      const d = miner.destChain?.toLowerCase();
      if (!((s === 'btc' && d === 'tao') || (s === 'tao' && d === 'btc')))
        continue;

      const rate = resolveRate(miner, direction);
      if (rate === null) continue;

      const receiveGross = parsedAmount * rate;
      const fee = receiveGross * FEE_RATE;
      const receiveNet = receiveGross - fee;
      const capacityTao = parseInt(miner.collateralRao, 10) / 1e9;
      const taoExposure = computeTaoExposure(parsedAmount, rate, direction);

      rows.push({
        uid: miner.uid,
        hotkey: miner.hotkey,
        rate,
        receiveGross,
        fee,
        receiveNet,
        capacityTao,
        isBestRate: false,
        exceedsCapacity: taoExposure > capacityTao,
      });
    }

    rows.sort((a, b) => b.receiveNet - a.receiveNet);

    if (rows.length > 0) {
      rows[0].isBestRate = true;
    }

    return rows;
  }, [miners, direction, parsedAmount]);

  const headerSx = {
    fontFamily: FONTS.mono,
    fontSize: '0.65rem',
    color: theme.palette.text.secondary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  };

  const cellSx = {
    fontFamily: FONTS.mono,
    fontSize: '0.75rem',
    borderBottom: `1px solid ${theme.palette.divider}`,
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmountStr(val);
    }
  };

  if (isLoading || !miners) {
    return <SwapQuoteCalculatorSkeleton />;
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            sx={{ fontFamily: FONTS.heading, fontWeight: 700 }}
          >
            Swap Quote
          </Typography>
          <Tooltip
            title={
              <Stack spacing={0.5} sx={{ maxWidth: 250 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  Quote Estimator
                </Typography>
                <Typography variant="body2">
                  Enter an amount and see what each active miner would offer.
                  Rates include the {FEE_RATE * 100}% protocol fee. The best
                  rate is highlighted.
                </Typography>
              </Stack>
            }
            arrow
            placement="right"
          >
            <InfoOutlinedIcon
              fontSize="small"
              sx={{ color: 'text.secondary', cursor: 'help' }}
            />
          </Tooltip>
        </Box>
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Amount"
          value={amountStr}
          onChange={handleAmountChange}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.7rem',
                    color: 'text.secondary',
                  }}
                >
                  {config.fromSymbol}
                </Typography>
              </InputAdornment>
            ),
          }}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              color: 'text.primary',
              borderRadius: 0,
              height: 32,
              '& fieldset': { borderColor: 'divider' },
              '&:hover fieldset': {
                borderColor: theme.palette.border.light,
              },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />

        <Select
          size="small"
          value={direction}
          onChange={(e) => setDirection(e.target.value as Direction)}
          renderValue={() => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SwapHorizIcon sx={{ fontSize: 14 }} />
              <span>
                {config.fromSymbol} → {config.toSymbol}
              </span>
            </Box>
          )}
          sx={{
            width: 150,
            height: 32,
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color: 'text.primary',
            borderRadius: 0,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.border.light,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
          }}
        >
          <MenuItem
            value="btcToTao"
            sx={{ fontFamily: FONTS.mono, fontSize: '0.75rem' }}
          >
            BTC → TAO
          </MenuItem>
          <MenuItem
            value="taoToBtc"
            sx={{ fontFamily: FONTS.mono, fontSize: '0.75rem' }}
          >
            TAO → BTC
          </MenuItem>
        </Select>
      </Stack>

      <TableContainer
        sx={{
          maxHeight: 340,
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
              <TableCell sx={headerSx}>UID</TableCell>
              <TableCell sx={headerSx}>Rate</TableCell>
              <TableCell sx={headerSx} align="right">
                <Tooltip
                  title={`Amount you receive in ${config.toSymbol} after the ${FEE_RATE * 100}% fee`}
                  arrow
                  placement="top"
                >
                  <span
                    style={{ cursor: 'help', borderBottom: '1px dotted' }}
                  >
                    You Receive
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell sx={headerSx} align="right">
                Fee
              </TableCell>
              <TableCell sx={headerSx} align="right">
                Capacity
              </TableCell>
              <TableCell sx={headerSx}>Hotkey</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!hasValidAmount ? (
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
                  Enter an amount to see quotes
                </TableCell>
              </TableRow>
            ) : quotes.length === 0 ? (
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
                  No miners available for {config.fromSymbol} →{' '}
                  {config.toSymbol}
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((row) => (
                <TableRow
                  key={row.uid}
                  sx={{
                    backgroundColor: row.isBestRate
                      ? `${theme.palette.status.completed}14`
                      : 'transparent',
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                >
                  <TableCell sx={{ ...cellSx, color: 'text.primary' }}>
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                    >
                      {row.uid}
                      {row.isBestRate && (
                        <Box
                          sx={{
                            fontSize: '0.55rem',
                            fontFamily: FONTS.mono,
                            color: theme.palette.status.completed,
                            border: `1px solid ${theme.palette.status.completed}`,
                            px: 0.5,
                            lineHeight: 1.6,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Best
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ ...cellSx, color: 'primary.main' }}>
                    {row.rate.toFixed(2)}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...cellSx,
                      color: row.isBestRate
                        ? theme.palette.status.completed
                        : 'text.primary',
                      fontWeight: row.isBestRate ? 600 : 400,
                    }}
                    align="right"
                  >
                    {formatReceive(row.receiveNet, direction)}{' '}
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '0.6rem',
                        color: 'text.secondary',
                        fontFamily: FONTS.mono,
                      }}
                    >
                      {config.toSymbol}
                    </Typography>
                  </TableCell>
                  <TableCell
                    sx={{ ...cellSx, color: 'text.secondary' }}
                    align="right"
                  >
                    {formatReceive(row.fee, direction)}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...cellSx,
                      color: row.exceedsCapacity
                        ? theme.palette.status.timedOut
                        : 'text.secondary',
                    }}
                    align="right"
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 0.5,
                      }}
                    >
                      {row.exceedsCapacity && (
                        <Tooltip
                          title="Swap amount exceeds this miner's collateral capacity"
                          arrow
                          placement="top"
                        >
                          <WarningAmberIcon
                            sx={{
                              fontSize: '0.85rem',
                              color: theme.palette.status.timedOut,
                            }}
                          />
                        </Tooltip>
                      )}
                      {row.capacityTao.toFixed(2)} TAO
                    </Box>
                  </TableCell>
                  <TableCell
                    sx={{
                      ...cellSx,
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                    }}
                  >
                    <CopyableAddress address={row.hotkey} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {hasValidAmount && quotes.length > 0 && (
        <Stack
          spacing={0.75}
          sx={{
            mt: 1.5,
            pt: 1.5,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" justifyContent="space-between">
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.65rem',
                color: 'text.secondary',
              }}
            >
              {quotes.length} miner{quotes.length !== 1 ? 's' : ''} available
              {quotes.some((q) => q.exceedsCapacity) && (
                <Typography
                  component="span"
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.65rem',
                    color: theme.palette.status.timedOut,
                    ml: 1,
                  }}
                >
                  ({quotes.filter((q) => q.exceedsCapacity).length} over
                  capacity)
                </Typography>
              )}
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.65rem',
                color: 'text.secondary',
              }}
            >
              Best: {formatReceive(quotes[0].receiveNet, direction)}{' '}
              {config.toSymbol} ({FEE_RATE * 100}% fee incl.)
            </Typography>
          </Stack>
          {(() => {
            const savings = computeSavings(quotes);
            if (savings === null || savings <= 0) return null;
            const pct =
              quotes[quotes.length - 1].receiveNet > 0
                ? (savings / quotes[quotes.length - 1].receiveNet) * 100
                : 0;
            return (
              <Stack direction="row" justifyContent="flex-end">
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.65rem',
                    color: theme.palette.status.completed,
                  }}
                >
                  Best rate saves {formatReceive(savings, direction)}{' '}
                  {config.toSymbol}
                  {pct > 0.01 ? ` (+${pct.toFixed(2)}%)` : ''} vs worst
                </Typography>
              </Stack>
            );
          })()}
        </Stack>
      )}
    </Box>
  );
};

export default SwapQuoteCalculator;
