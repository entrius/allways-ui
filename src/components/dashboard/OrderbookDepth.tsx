import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  MenuItem,
  Select,
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

const OrderbookDepth: React.FC = () => {
  const theme = useTheme();

  const TAO_COLOR = theme.palette.mode === 'dark' ? '#F3F4F6' : '#111827';
  const BTC_COLOR = '#F7931A';

  const BtcIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <circle cx="16" cy="16" r="16" fill={BTC_COLOR} />
      <path
        fill="#FFF"
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

  const { data: miners = [] } = useMiners();

  const [selectedPair, setSelectedPair] = useState<string>('');

  const uniqueAssets = useMemo(() => {
    const assets = new Set<string>();
    miners.forEach((m) => {
      const s = m.sourceChain?.toLowerCase();
      const d = m.destChain?.toLowerCase();
      if (!s || !d) return;
      if (s === 'tao') assets.add(d.toUpperCase());
      else if (d === 'tao') assets.add(s.toUpperCase());
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
    if (miners.length === 0 || !selectedPair) {
      return [];
    }

    const asset = selectedPair.toLowerCase();
    const groups: Record<string, number> = {};

    miners.forEach((m) => {
      if (!m.rate || !m.collateralRao) return;
      const s = m.sourceChain?.toLowerCase();
      const d = m.destChain?.toLowerCase();

      if ((s === asset && d === 'tao') || (s === 'tao' && d === asset)) {
        const rateVal = parseFloat(m.rate);
        if (!isNaN(rateVal) && rateVal > 0) {
          const rateStr = rateVal.toFixed(2);
          groups[rateStr] =
            (groups[rateStr] || 0) + parseInt(m.collateralRao, 10) / 1e9;
        }
      }
    });

    const sortedRates = Object.keys(groups).sort(
      (a, b) => parseFloat(b) - parseFloat(a),
    );

    let cumAssetToTao = 0;
    const topDown = sortedRates.map((rateStr) => {
      cumAssetToTao += groups[rateStr];
      return cumAssetToTao;
    });

    let cumTaoToAsset = 0;
    const bottomUp = new Array(sortedRates.length);
    for (let i = sortedRates.length - 1; i >= 0; i--) {
      cumTaoToAsset += groups[sortedRates[i]];
      bottomUp[i] = cumTaoToAsset;
    }

    return sortedRates.map((rateStr, i) => ({
      rate: rateStr,
      capacity: groups[rateStr],
      cumAssetToTao: topDown[i],
      cumTaoToAsset: bottomUp[i],
    }));
  }, [miners, selectedPair]);

  const maxCum =
    depthData.length > 0 ? depthData[depthData.length - 1].cumAssetToTao : 1;
  const getAssetSymbol = () =>
    selectedPair ? selectedPair.replace('/TAO', '').trim() : '';

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
            Depth of Market
          </Typography>
          <Tooltip
            title={
              <Box sx={{ p: 0.5, maxWidth: 250 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 'bold', mb: 0.5 }}
                >
                  What is this?
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: 'text.secondary' }}
                >
                  This orderbook visualizes the cumulative liquidity available
                  across all active miners at various exchange rates.
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  The background bars form a volume profile: you can identify
                  the market equilibrium point where the left and right profiles
                  match in width.
                </Typography>
              </Box>
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
                    {row.capacity.toFixed(2)}
                  </TableCell>
                  <TableCell
                    sx={{ ...cellSx, color: assetThemeColor }}
                    align="right"
                  >
                    {(row.cumAssetToTao / parseFloat(row.rate)).toFixed(6)}
                  </TableCell>
                  <TableCell
                    sx={{ ...cellSx, color: taoThemeColor }}
                    align="right"
                  >
                    {row.cumTaoToAsset.toFixed(2)}
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
                    color: 'text.secondary',
                    borderBottom: 'none',
                    py: 4,
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
