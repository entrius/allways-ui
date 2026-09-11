import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { FLASH_ANIMATION } from './flash';
import {
  orderByMarketCap,
  useChains,
  useChainSupply,
  useCurrentCrown,
  useMarketCaps,
} from '../../api';
import { hubLeg, type ChainInfo } from '../../api/models/chains';
import {
  crownLaneFor,
  decomposeDirection,
  type CurrentCrownMap,
  type Direction,
} from '../../api/models/MinersDashboard';
import { directionalRate, formatRate } from '../../utils/format';
import { FONTS } from '../../theme';
import { ChainLogo, NetworkBadge } from '../ChainLogo';
import type { MatrixSettings } from './matrixSettings';

// A spreadsheet of bare numbers, port of allways-matrix into the site's own
// theme. Turned on its side: the hubs are COLUMNS (two each) and every asset
// is a row, so the sheet grows downward as the registry grows and scrolls
// the way a page does. The rule never changes: under each hub, the LEFT
// (plain) column is FROM the hub, the RIGHT (banded) column is TO the hub.
// Every number is in the row asset, per 1 unit of the hub:
//   left    you send 1 SOL, you get this much of the row asset
//   right   you get 1 SOL, you send this much of the row asset
// Same unit in both columns, so the gap between them is the spread. Tone is
// the only marker; hovering a number or a hub spells it out in full. Each
// direction stays its own instrument: no midpoint, no buy/sell.

const HEAD_H = 52;
const ROW_H = 30;
// Floor only: the number columns grow to fit their values.
const COL_MIN = 84;

interface CellRates {
  // Row asset received per 1 hub sent (hub → asset).
  out: number | null;
  // Row asset sent per 1 hub received (asset → hub). Same unit as `out`
  // so the two directions read on one scale and the spread is the gap.
  back: number | null;
}

const invert = (n: number | null): number | null => (n && n > 0 ? 1 / n : n);

const directionKey = (from: string, to: string): string =>
  `${from}-${to}`.toUpperCase();

// The lane shown for a cell is the one scored on the COLUMN's hub. Spoke
// pairs have exactly one lane (their hub leg); the hub↔hub pair has one per
// hub, so the SOL columns show the sol-backed crown and the TAO columns the
// tao-backed one.
const cellRates = (
  hub: string,
  asset: string,
  crown: CurrentCrownMap | undefined,
): CellRates => ({
  out: directionalRate(
    hub,
    asset,
    crownLaneFor(crown, directionKey(hub, asset), hub)?.rate,
  ),
  back: invert(
    directionalRate(
      asset,
      hub,
      crownLaneFor(crown, directionKey(asset, hub), hub)?.rate,
    ),
  ),
});

// One asset mention, drawn from whichever label parts are switched on.
const AssetLabel: React.FC<{
  chain: ChainInfo;
  chains: ChainInfo[];
  logo: boolean;
  ticker: boolean;
  network: boolean;
  logoSize: number;
}> = ({ chain, chains, logo, ticker, network, logoSize }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
    {logo && (
      <Box sx={{ position: 'relative', lineHeight: 0 }}>
        <ChainLogo chain={chain.id} size={logoSize} />
        <NetworkBadge chain={chain} chains={chains} logoSize={logoSize} />
      </Box>
    )}
    {(ticker || network) && (
      <Box
        sx={{
          display: 'inline-flex',
          flexDirection: 'column',
          lineHeight: 1.15,
        }}
      >
        {ticker && (
          <Typography
            component="span"
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.72rem',
              fontWeight: 600,
            }}
          >
            {chain.symbol}
          </Typography>
        )}
        {network && chain.network && (
          <Typography
            component="span"
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.6rem',
              color: 'text.secondary',
            }}
          >
            {chain.network}
          </Typography>
        )}
      </Box>
    )}
  </Box>
);

const Cell: React.FC<{
  value: number | null;
  self: boolean;
  band: boolean;
  selected: boolean;
  // Bumps every time the value changes; a fresh key restarts the flash.
  seq: number;
  onSelect: () => void;
}> = ({ value, self, band, selected, seq, onSelect }) => {
  const empty = value === null || value === 0;
  const cell = (
    <Box
      component="td"
      key={seq}
      onClick={self ? undefined : onSelect}
      aria-selected={selected || undefined}
      sx={{
        minWidth: COL_MIN,
        height: ROW_H,
        textAlign: 'right',
        fontFamily: FONTS.mono,
        fontSize: '0.74rem',
        fontWeight: selected ? 700 : 500,
        fontVariantNumeric: 'tabular-nums',
        color: empty ? 'text.disabled' : 'text.primary',
        // The picked cell reads like a spreadsheet's active cell: a full
        // ring in the text colour, drawn with outline so it never fights
        // the flash's inset shadow, over a filled background.
        backgroundColor: self
          ? 'background.default'
          : selected
            ? 'action.selected'
            : band
              ? 'action.hover'
              : 'transparent',
        outline: selected ? '2px solid' : undefined,
        outlineColor: selected ? 'text.primary' : undefined,
        outlineOffset: -2,
        position: selected ? 'relative' : undefined,
        zIndex: selected ? 1 : undefined,
        cursor: self ? 'default' : 'pointer',
        '&:hover': self ? undefined : { backgroundColor: 'action.selected' },
        ...(seq > 0 && !self ? { animation: FLASH_ANIMATION } : {}),
      }}
    >
      {self ? '' : empty ? '—' : formatRate(value)}
    </Box>
  );
  return cell;
};

// The sheet's rows: hubs first, in das priority order (the same order the
// rest of the site files pairs under), then every other asset by market
// cap, largest first, with same-asset deployments ordered by their chain's
// supply. Shared with the widget's settings panel so it lists rows in the
// order the sheet shows them.
export const useMatrixAssets = (): ChainInfo[] => {
  const { data: chains } = useChains();
  const { data: caps } = useMarketCaps(chains);
  const { data: supply } = useChainSupply(chains);
  return useMemo(
    () => orderByMarketCap(chains, caps, supply),
    [chains, caps, supply],
  );
};

// Hubs always show as rows; the rest honour hidden and favorites-only.
export const visibleAssets = (
  all: ChainInfo[],
  settings: MatrixSettings,
): ChainInfo[] =>
  all.filter(
    (a) =>
      a.hub ||
      (!settings.hidden.includes(a.id) &&
        (!settings.favoritesOnly || settings.favorites.includes(a.id))),
  );

// The sheet is also the picker: clicking a number selects that DIRECTION
// (hub → asset for a plain column, asset → hub for a banded one) for the
// panels beside it.
const RateMatrix: React.FC<{
  direction: Direction;
  // The hub column the selection was made in. Only matters for the hub↔hub
  // pair, which appears under both hub columns.
  base?: string;
  onDirectionChange: (direction: Direction, hub: string) => void;
  /** The widget's settings, owned by the page (its gear lives in the
   * widget's title row, outside the sheet). */
  settings: MatrixSettings;
  /** The row stars star and unstar assets in place. */
  toggleFavorite: (id: string) => void;
}> = ({ direction, base, onDirectionChange, settings, toggleFavorite }) => {
  const theme = useTheme();
  const { data: chains } = useChains();
  const { data: crown, dataUpdatedAt, isError } = useCurrentCrown();
  // The picked cell's row asset and hub column, so their headers can light
  // up the way a spreadsheet marks the active cell's row and column.
  const selLegs = decomposeDirection(direction);
  const selHub = base ?? hubLeg(selLegs.from, selLegs.to) ?? selLegs.from;
  const selAsset = selLegs.from === selHub ? selLegs.to : selLegs.from;

  const hubs = useMemo(() => chains.filter((c) => c.hub), [chains]);
  const allAssets = useMatrixAssets();
  const assets = useMemo(
    () => visibleAssets(allAssets, settings),
    [allAssets, settings],
  );
  // Logos grow as text leaves the label: 16px beside two lines, 20px beside
  // one, 28px on their own.
  const { logo, ticker, network } = settings.header;
  const logoSize = !logo
    ? 16
    : !ticker && !network
      ? 28
      : ticker && network
        ? 16
        : 20;
  const logoOnly = logo && !ticker && !network;

  // Every cell's current number, and a per-cell change counter so a moved
  // rate flashes once. The first fill doesn't flash (counter stays 0).
  const rates = useMemo(() => {
    const m: Record<string, CellRates> = {};
    for (const hub of hubs)
      for (const a of allAssets)
        if (a.id !== hub.id)
          m[`${hub.id}|${a.id}`] = cellRates(hub.id, a.id, crown);
    return m;
  }, [hubs, allAssets, crown]);
  // Only a fill that FOLLOWS a live one counts as a move: the seed-to-live
  // step would otherwise light every cell at once.
  const prev = useRef<Record<string, CellRates> | null>(null);
  const [seq, setSeq] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!crown) return;
    const before = prev.current;
    prev.current = rates;
    if (!before) return;
    const bumped: string[] = [];
    for (const [k, r] of Object.entries(rates)) {
      const b = before[k];
      if (b && b.out !== r.out) bumped.push(`${k}|out`);
      if (b && b.back !== r.back) bumped.push(`${k}|back`);
    }
    if (!bumped.length) return;
    setSeq((s) => {
      const n = { ...s };
      for (const k of bumped) n[k] = (n[k] ?? 0) + 1;
      return n;
    });
  }, [rates, crown]);

  const status = isError
    ? 'offline'
    : dataUpdatedAt
      ? `live ${new Date(dataUpdatedAt).toLocaleTimeString([], {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : 'loading…';

  const pinnedSx = {
    position: 'sticky',
    backgroundColor: 'background.default',
  } as const;

  return (
    <Box
      sx={{
        // The page scrolls; the header row and asset column stay pinned
        // within it. Sideways the sheet scrolls on its own if it is wider
        // than its half.
        width: '100%',
        overflowX: 'auto',
        '--flash': alpha(theme.palette.primary.main, 0.28),
      }}
    >
      <Box
        component="table"
        sx={{
          // The sheet fills its widget: the asset column keeps its content
          // width and the number columns share the rest, so a wider widget
          // means roomier cells, never dead space beside the table.
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          tableLayout: 'auto',
          '& th, & td': {
            px: 1.25,
            fontWeight: 'inherit',
            verticalAlign: 'middle',
            whiteSpace: 'nowrap',
            borderRight: '1px solid',
            borderBottom: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <thead>
          <tr>
            {/* Corner: live status. Settings are the widget's gear. */}
            <Box
              component="th"
              sx={{
                ...pinnedSx,
                top: 0,
                left: 0,
                zIndex: 3,
                height: HEAD_H,
                textAlign: 'left',
                overflow: 'visible',
                borderRightColor: 'border.light',
                borderBottomColor: 'border.light',
              }}
            >
              <Typography
                component="span"
                sx={{
                  display: 'block',
                  fontFamily: FONTS.mono,
                  fontSize: '0.6rem',
                  color: isError ? 'error.main' : 'text.secondary',
                }}
              >
                {status}
              </Typography>
            </Box>
            {hubs.map((hub) => (
              <Box
                component="th"
                key={hub.id}
                colSpan={2}
                title={`${hub.symbol}${hub.network ? ` · ${hub.network}` : ''}\nLeft: send 1 ${hub.symbol}, get this much\nRight: get 1 ${hub.symbol}, send this much`}
                sx={{
                  ...pinnedSx,
                  top: 0,
                  zIndex: 1,
                  height: HEAD_H,
                  minWidth: COL_MIN * 2,
                  cursor: 'help',
                  textAlign: logoOnly ? 'center' : 'left',
                  borderBottomColor: 'border.light',
                  ...(hub.id === selHub
                    ? {
                        backgroundColor: 'action.selected',
                        boxShadow: (t) =>
                          `inset 0 -2px 0 ${t.palette.text.primary}`,
                      }
                    : {}),
                }}
              >
                <AssetLabel
                  chain={hub}
                  chains={chains}
                  logo={logo}
                  ticker={ticker}
                  network={network}
                  logoSize={logoSize}
                />
              </Box>
            ))}
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const fav = settings.favorites.includes(asset.id);
            return (
              <tr key={asset.id}>
                <Box
                  component="th"
                  title={`${asset.symbol}${asset.network ? ` · ${asset.network}` : ''}`}
                  sx={{
                    ...pinnedSx,
                    left: 0,
                    zIndex: 2,
                    height: ROW_H,
                    textAlign: logoOnly ? 'center' : 'left',
                    borderRightColor: 'border.light',
                    // Room for the star at the right edge.
                    pr: asset.hub ? undefined : 3,
                    '&:hover .matrix-star': { opacity: 1 },
                    ...(asset.id === selAsset
                      ? {
                          backgroundColor: 'action.selected',
                          boxShadow: (t) =>
                            `inset -2px 0 0 ${t.palette.text.primary}`,
                        }
                      : {}),
                  }}
                >
                  <AssetLabel
                    chain={asset}
                    chains={chains}
                    logo={logo}
                    ticker={ticker}
                    network={network}
                    logoSize={logoSize}
                  />
                  {!asset.hub && (
                    <Box
                      component="button"
                      type="button"
                      className="matrix-star"
                      title={fav ? 'unstar' : 'star'}
                      onClick={() => toggleFavorite(asset.id)}
                      sx={{
                        all: 'unset',
                        position: 'absolute',
                        right: 4,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        cursor: 'pointer',
                        fontSize: 12,
                        lineHeight: 1,
                        opacity: fav ? 1 : 0,
                        color: fav ? '#e8b923' : 'border.light',
                        '&:hover': {
                          color: fav ? '#e8b923' : 'text.secondary',
                        },
                      }}
                    >
                      ★
                    </Box>
                  )}
                </Box>
                {hubs.map((hub) => {
                  const self = asset.id === hub.id;
                  const k = `${hub.id}|${asset.id}`;
                  const r = self ? undefined : rates[k];
                  const out = r?.out ?? null;
                  const back = r?.back ?? null;
                  const outDir = directionKey(hub.id, asset.id);
                  const backDir = directionKey(asset.id, hub.id);
                  return (
                    <React.Fragment key={hub.id}>
                      <Cell
                        value={out}
                        self={self}
                        band={false}
                        selected={
                          outDir === direction && (!base || hub.id === base)
                        }
                        seq={seq[`${k}|out`] ?? 0}
                        onSelect={() => onDirectionChange(outDir, hub.id)}
                      />
                      <Cell
                        value={back}
                        self={self}
                        band
                        selected={
                          backDir === direction && (!base || hub.id === base)
                        }
                        seq={seq[`${k}|back`] ?? 0}
                        onSelect={() => onDirectionChange(backDir, hub.id)}
                      />
                    </React.Fragment>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </Box>
    </Box>
  );
};

export default RateMatrix;
