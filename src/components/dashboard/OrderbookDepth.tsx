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
import { tableHeaderSx, tableCellSx } from './tableStyles';
import { toChainUnits } from '../../utils';

const OrderbookDepth: React.FC = () => {
  const theme = useTheme();

  const TAO_COLOR = theme.palette.asset.tao;
  const BTC_COLOR = theme.palette.asset.btc;

  const BtcIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <circle cx="16" cy="16" r="16" fill={BTC_COLOR} />
      <path
        fill={theme.palette.common.white}
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

  const headerSx = tableHeaderSx(theme);
  const cellSx = tableCellSx(theme);

  const { data: miners, isLoading } = useMiners();
  const [selectedPair, setSelectedPair] = useState<string>('');

  const uniqueAssets = useMemo(() => {
    const assets = new Set<string>();
    miners?.forEach((m) => {
      const s = m.sourceChain?.toLowerCase();
      const d = m.destChain?.toLowerCase();
      if (!s || !d) return;
      // After canonicalization from the scraper, TAO is always destChain when present,
      // so the asset side is always sourceChain. Keeping the tao→asset branch as a
      // defensive fallback in case pre-migration rows are still in flight.
      if (d === 'tao') assets.add(s.toUpperCase());
      else if (s === 'tao') assets.add(d.toUpperCase());
    });
    return Array.from(assets).sort();
  }, [miners]);

  useEffect(() => {
    if (!selectedPair && uniqueAssets.length > 0) {
      setSelectedPair(uniqueAssets[0]);
    } else if (
      uniqueAssets.length > 0 &&
      !uniqueAssets.includes(selectedPair)
    ) {
      setSelectedPair(uniqueAssets[0]);
    }
  }, [uniqueAssets, selectedPair]);

  const depthData = useMemo(() => {
    if (!miners?.length || !selectedPair) {
      return [];
    }

    const asset = selectedPair.toLowerCase();
    // Two independent rate ladders — the forward (asset→TAO) and reverse (TAO→asset)
    // quotes are now distinct per miner, so they each get their own aggregation.
    const forwardGroups: Record<string, number> = {}; // key = rate, val = capacity TAO
    const reverseGroups: Record<string, number> = {}; // key = counterRate, val = capacity TAO

    miners.forEach((m) => {
      if (!m.collateralRao) return;
      const s = m.sourceChain?.toLowerCase();
      const d = m.destChain?.toLowerCase();
      // Canonical order: asset is source, tao is dest. rate = asset→TAO, counterRate = TAO→asset.
      if (s !== asset || d !== 'tao') return;

      const capacityTao = toChainUnits(m.collateralRao, 'tao');
      if (isNaN(capacityTao) || capacityTao <= 0) return;

      const forward = m.rate ? parseFloat(m.rate) : 0;
      if (!isNaN(forward) && forward > 0) {
        const key = forward.toFixed(2);
        forwardGroups[key] = (forwardGroups[key] || 0) + capacityTao;
      }

      const reverse = m.counterRate ? parseFloat(m.counterRate) : 0;
      if (!isNaN(reverse) && reverse > 0) {
        const key = reverse.toFixed(2);
        reverseGroups[key] = (reverseGroups[key] || 0) + capacityTao;
      }
    });

    // Union the rate axis so both ladders render against the same rows.
    const allRates = Array.from(
      new Set([...Object.keys(forwardGroups), ...Object.keys(reverseGroups)]),
    ).sort((a, b) => parseFloat(b) - parseFloat(a));

    // Forward book cumulates top-down (best asset→TAO rate first = highest TAO per asset).
    let cumAssetToTao = 0;
    const forwardCum: number[] = [];
    for (const key of allRates) {
      cumAssetToTao += forwardGroups[key] || 0;
      forwardCum.push(cumAssetToTao);
    }

    // Reverse book cumulates bottom-up (best TAO→asset rate = lowest TAO per asset).
    let cumTaoToAsset = 0;
    const reverseCum = new Array<number>(allRates.length);
    for (let i = allRates.length - 1; i >= 0; i--) {
      cumTaoToAsset += reverseGroups[allRates[i]] || 0;
      reverseCum[i] = cumTaoToAsset;
    }

    return allRates.map((key, i) => ({
      rate: key,
      forwardCapacity: forwardGroups[key] || 0,
      reverseCapacity: reverseGroups[key] || 0,
      cumAssetToTao: forwardCum[i],
      cumTaoToAsset: reverseCum[i],
    }));
  }, [miners, selectedPair]);

  const maxCum = useMemo(() => {
    if (depthData.length === 0) return 1;
    let m = 0;
    for (const row of depthData) {
      if (row.cumAssetToTao > m) m = row.cumAssetToTao;
      if (row.cumTaoToAsset > m) m = row.cumTaoToAsset;
    }
    return m > 0 ? m : 1;
  }, [depthData]);
  const getAssetSymbol = () =>
    selectedPair ? selectedPair.replace('/TAO', '').trim() : '';

  return isLoading || !miners ? (
    <OrderbookDepthSkeleton />
  ) : (
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
                  The background bars form a volume profile: you can identify
                  the market equilibrium point where the left and right profiles
                  match in width.
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

        {uniqueAssets.length > 0 && (
          <Select
            size="small"
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value as string)}
            sx={{
              width: 140,
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
            {uniqueAssets.map((asset) => (
              <MenuItem
                key={asset}
                value={asset}
                sx={{ fontFamily: FONTS.mono, fontSize: '0.75rem' }}
              >
                {`${asset} / TAO`}
              </MenuItem>
            ))}
          </Select>
        )}
      </Box>

      <TableContainer
        sx={{
          maxHeight: 500,
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
                  title={`The specific exchange rate for ${getAssetSymbol() || 'Asset'}/TAO.`}
                  arrow
                  placement="top"
                >
                  <span style={{ cursor: 'help', borderBottom: '1px dotted' }}>
                    Rate (TAO)
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell sx={headerSx} align="right">
                <Tooltip
                  title="Total capacity available at this exact rate."
                  arrow
                  placement="top"
                >
                  <span style={{ cursor: 'help', borderBottom: '1px dotted' }}>
                    Capacity
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell sx={headerSx} align="right">
                <Tooltip
                  title={`How much ${getAssetSymbol() || 'Asset'} you could convert to TAO.`}
                  arrow
                  placement="top"
                >
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      cursor: 'help',
                    }}
                  >
                    <AssetIcon asset={getAssetSymbol()} /> → <TaoIcon />
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell sx={headerSx} align="right">
                <Tooltip
                  title={`How much TAO you could convert to ${getAssetSymbol() || 'Asset'}.`}
                  arrow
                  placement="top"
                >
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      cursor: 'help',
                    }}
                  >
                    <TaoIcon /> → <AssetIcon asset={getAssetSymbol()} />
                  </Box>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {depthData.map((row) => {
              const pctAssetToTao = (row.cumAssetToTao / maxCum) * 100;
              const pctTaoToAsset = (row.cumTaoToAsset / maxCum) * 100;

              const isBtc = getAssetSymbol().toUpperCase() === 'BTC';
              const hexToRgba = (hex: string, alpha: number) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
              };

              const assetThemeColor = isBtc
                ? BTC_COLOR
                : theme.palette.primary.main;
              const taoThemeColor = TAO_COLOR;

              const leftGradColor = hexToRgba(assetThemeColor, 0.1);
              const rightGradColor =
                theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.08)';

              return (
                <TableRow
                  key={row.rate}
                  sx={{
                    backgroundColor: 'transparent',
                    backgroundImage: `
                      linear-gradient(to left, ${leftGradColor} ${pctAssetToTao}%, transparent ${pctAssetToTao}%),
                      linear-gradient(to left, ${rightGradColor} ${pctTaoToAsset}%, transparent ${pctTaoToAsset}%)
                    `,
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
                    {(row.forwardCapacity + row.reverseCapacity).toFixed(2)}
                  </TableCell>
                  <TableCell
                    sx={{ ...cellSx, color: assetThemeColor }}
                    align="right"
                  >
                    {row.cumAssetToTao > 0
                      ? (row.cumAssetToTao / parseFloat(row.rate)).toFixed(6)
                      : '\u2014'}
                  </TableCell>
                  <TableCell
                    sx={{ ...cellSx, color: taoThemeColor }}
                    align="right"
                  >
                    {row.cumTaoToAsset > 0
                      ? row.cumTaoToAsset.toFixed(2)
                      : '\u2014'}
                  </TableCell>
                </TableRow>
              );
            })}

            {depthData.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
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
