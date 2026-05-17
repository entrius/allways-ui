import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useMiners } from '../../api';
import { FONTS } from '../../theme';
import { OrderbookDepthSkeleton } from './Skeletons';

const OrderbookDepth: React.FC = () => {
  const theme = useTheme();

  const TAO_COLOR = theme.palette.asset.tao;
  const BTC_COLOR = theme.palette.asset.btc;

  const BtcIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <circle cx="16" cy="16" r="16" fill={BTC_COLOR} />
      <path
        fill="var(--color-white)"
        fillRule="evenodd"
        d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z"
      />
    </svg>
  );

  const TaoIcon = ({ size = 16, color }: { size?: number; color?: string }) => (
    <svg viewBox="0 0 21.6 23.1" width={size} height={size}>
      <path
        fill={color || TAO_COLOR}
        d="M13.1,17.7V8.3c0-2.4-1.9-4.3-4.3-4.3v15.1c0,2.2,1.7,4,3.9,4c0.1,0,0.1,0,0.2,0c1,0.1,2.1-0.2,2.9-0.9C13.3,22,13.1,20.5,13.1,17.7L13.1,17.7z"
      />
      <path
        fill={color || TAO_COLOR}
        d="M3.9,0C1.8,0,0,1.8,0,4h17.6c2.2,0,3.9-1.8,3.9-4C21.6,0,3.9,0,3.9,0z"
      />
    </svg>
  );

  const AssetIcon = ({
    asset,
    size = 16,
  }: {
    asset: string;
    size?: number;
  }) => {
    if (asset.toUpperCase() === 'BTC') return <BtcIcon size={size} />;
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: theme.palette.text.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          sx={{
            fontSize: size * 0.6,
            color: theme.palette.background.paper,
            fontWeight: 'bold',
          }}
        >
          {asset[0]?.toUpperCase()}
        </Typography>
      </Box>
    );
  };

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

  const { data: miners, isLoading } = useMiners();
  type Direction = 'forward' | 'reverse';
  type DirectionOption = {
    asset: string;
    direction: Direction;
    key: string;
    label: string;
  };
  const [selectedKey, setSelectedKey] = useState<string>('');

  const directionOptions = useMemo<DirectionOption[]>(() => {
    const seen = new Map<string, DirectionOption>();
    miners?.forEach((m) => {
      const s = m.sourceChain?.toLowerCase();
      const d = m.destChain?.toLowerCase();
      if (!s || d !== 'tao' || s === 'tao') return;
      const asset = s.toUpperCase();
      const fwd = m.rate ? parseFloat(m.rate) : 0;
      const rev = m.counterRate ? parseFloat(m.counterRate) : 0;
      if (fwd > 0) {
        const key = `${asset}>forward`;
        if (!seen.has(key))
          seen.set(key, {
            asset,
            direction: 'forward',
            key,
            label: `${asset} → TAO`,
          });
      }
      if (rev > 0) {
        const key = `${asset}>reverse`;
        if (!seen.has(key))
          seen.set(key, {
            asset,
            direction: 'reverse',
            key,
            label: `TAO → ${asset}`,
          });
      }
    });
    return Array.from(seen.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [miners]);

  useEffect(() => {
    if (directionOptions.length === 0) return;
    if (!directionOptions.find((o) => o.key === selectedKey)) {
      setSelectedKey(directionOptions[0].key);
    }
  }, [directionOptions, selectedKey]);

  const selected = directionOptions.find((o) => o.key === selectedKey) ?? null;

  const depthData = useMemo(() => {
    if (!miners?.length || !selected) return [];
    const asset = selected.asset.toLowerCase();
    const groups: Record<string, number> = {}; // key = rate, val = collateral TAO

    miners.forEach((m) => {
      // Inactive miners aren't tradeable depth — they still have a quote
      // stored on-chain but no one can hit it. Including them produces
      // ghost rows (dust collateral at extreme rates) that stretch the
      // rate axis and contradict this panel's "active miners" framing.
      if (!m.isActive) return;
      if (!m.collateralRao) return;
      const s = m.sourceChain?.toLowerCase();
      const d = m.destChain?.toLowerCase();
      if (s !== asset || d !== 'tao') return;
      const capacityTao = parseInt(m.collateralRao, 10) / 1e9;
      if (isNaN(capacityTao) || capacityTao <= 0) return;
      const raw = selected.direction === 'forward' ? m.rate : m.counterRate;
      const r = raw ? parseFloat(raw) : 0;
      if (!isFinite(r) || r <= 0) return;
      const key = r.toFixed(2);
      groups[key] = (groups[key] || 0) + capacityTao;
    });

    // Best rate first: forward wants highest TAO/asset, reverse wants lowest.
    const rates = Object.keys(groups).sort((a, b) =>
      selected.direction === 'forward'
        ? parseFloat(b) - parseFloat(a)
        : parseFloat(a) - parseFloat(b),
    );

    let cum = 0;
    return rates.map((key) => {
      const capacity = groups[key];
      cum += capacity;
      return { rate: key, capacity, cumCapacity: cum };
    });
  }, [miners, selected]);

  const maxCum = useMemo(
    () =>
      depthData.reduce((m, r) => (r.cumCapacity > m ? r.cumCapacity : m), 1),
    [depthData],
  );

  return isLoading || !miners ? (
    <OrderbookDepthSkeleton />
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
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            sx={{ fontFamily: FONTS.heading, fontWeight: 700 }}
          >
            Depth of Market
          </Typography>
          <Tooltip
            title={
              <Stack spacing={0.5} sx={{ maxWidth: 250 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  What is this?
                </Typography>
                <Typography variant="body2">
                  This orderbook visualizes the cumulative liquidity available
                  across all active miners at various exchange rates.
                </Typography>
                <Typography variant="body2">
                  The background bars form a volume profile: the market
                  equilibrium point is where the left and right profiles match
                  in width.
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

        {directionOptions.length > 0 && (
          <Select
            size="small"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value as string)}
            sx={{
              width: 160,
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
            {directionOptions.map((opt) => (
              <MenuItem
                key={opt.key}
                value={opt.key}
                sx={{ fontFamily: FONTS.mono, fontSize: '0.75rem' }}
              >
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        )}
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
              <TableCell sx={headerSx}>
                <Tooltip
                  title={`Quoted rate for ${selected?.label ?? 'this direction'} (TAO per 1 ${selected?.asset ?? 'asset'}).`}
                  arrow
                  placement="top"
                >
                  <span
                    style={{ cursor: 'pointer', borderBottom: '1px dotted' }}
                  >
                    Rate (TAO)
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell sx={headerSx} align="right">
                <Tooltip
                  title="Capacity at this exact rate, denominated in TAO collateral."
                  arrow
                  placement="top"
                >
                  <span
                    style={{ cursor: 'pointer', borderBottom: '1px dotted' }}
                  >
                    Capacity (TAO)
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell sx={headerSx} align="right">
                <Tooltip
                  title="Cumulative capacity walking from the best rate down."
                  arrow
                  placement="top"
                >
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      cursor: 'pointer',
                    }}
                  >
                    {selected?.direction === 'reverse' ? (
                      <>
                        <TaoIcon /> {'→'} <AssetIcon asset={selected.asset} />
                      </>
                    ) : selected ? (
                      <>
                        <AssetIcon asset={selected.asset} /> {'→'} <TaoIcon />
                      </>
                    ) : (
                      <span>Cumulative</span>
                    )}
                  </Box>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {depthData.map((row) => {
              const pct = (row.cumCapacity / maxCum) * 100;
              const isBtc = selected?.asset.toUpperCase() === 'BTC';
              const assetThemeColor = isBtc
                ? BTC_COLOR
                : theme.palette.primary.main;
              const fillColor =
                selected?.direction === 'forward' ? assetThemeColor : TAO_COLOR;
              const gradColor = `color-mix(in srgb, ${fillColor} 14%, transparent)`;

              return (
                <TableRow
                  key={row.rate}
                  sx={{
                    backgroundColor: 'transparent',
                    backgroundImage: `linear-gradient(to left, ${gradColor} ${pct}%, transparent ${pct}%)`,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <TableCell sx={{ ...cellSx, color: 'text.primary' }}>
                    {row.rate}
                  </TableCell>
                  <TableCell
                    sx={{ ...cellSx, color: 'text.primary' }}
                    align="right"
                  >
                    {row.capacity.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, color: fillColor }} align="right">
                    {row.cumCapacity.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}

            {depthData.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  sx={{
                    textAlign: 'center',
                    borderBottom: 'none',
                    py: 4,
                    fontFamily: FONTS.mono,
                    fontSize: '0.8rem',
                    color: 'text.secondary',
                  }}
                >
                  No depth data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default OrderbookDepth;
