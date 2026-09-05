import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import { useChains, useCurrentCrown } from '../../api';
import { isToken, nativeOf, type ChainInfo } from '../../api/models/chains';
import {
  crownLaneFor,
  type CurrentCrownMap,
  type Direction,
} from '../../api/models/MinersDashboard';
import { directionalRate, formatRate } from '../../utils/format';
import { FONTS } from '../../theme';
import { ChainLogo } from '../ChainLogo';
import RateMatrixSettings from './RateMatrixSettings';
import { useMatrixSettings } from './matrixSettings';

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

const flash = keyframes`
  from { box-shadow: inset 0 0 0 999px var(--matrix-flash); }
  to   { box-shadow: inset 0 0 0 999px transparent; }
`;

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

// Badge art for networks das lists no native coin for. Served from /public.
const LOCAL_NETWORK_BADGES: Record<string, string> = {
  Arbitrum: '/networks/arbitrum.png',
  Base: '/networks/base.svg',
};

// Small network mark on a token's logo, bottom-right, ringed in the sheet
// tone so it reads as a separate mark. Nothing for a native coin.
const NetworkBadge: React.FC<{
  chain: ChainInfo;
  chains: ChainInfo[];
  logoSize: number;
}> = ({ chain, chains, logoSize }) => {
  if (!isToken(chain, chains)) return null;
  const native = nativeOf(chain, chains);
  const local = chain.network ? LOCAL_NETWORK_BADGES[chain.network] : undefined;
  if (!native && !local) return null;
  const size = Math.round(logoSize * 0.5);
  return (
    <Box
      sx={{
        position: 'absolute',
        right: -3,
        bottom: -2,
        width: size,
        height: size,
        borderRadius: '50%',
        boxShadow: (t) => `0 0 0 1.5px ${t.palette.background.default}`,
        backgroundColor: 'background.default',
        lineHeight: 0,
      }}
    >
      {native ? (
        <ChainLogo chain={native.id} size={size} />
      ) : (
        <Box
          component="img"
          src={local}
          alt=""
          draggable={false}
          sx={{
            width: size,
            height: size,
            borderRadius: '50%',
            display: 'block',
          }}
        />
      )}
    </Box>
  );
};

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
  title: string;
  // Bumps every time the value changes; a fresh key restarts the flash.
  seq: number;
  onSelect: () => void;
}> = ({ value, self, band, selected, title, seq, onSelect }) => {
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
        // The picked direction reads like the old watchlist's selected row:
        // a filled cell with a rule on its leading edge.
        backgroundColor: self
          ? 'background.default'
          : selected
            ? 'action.selected'
            : band
              ? 'action.hover'
              : 'transparent',
        boxShadow: selected
          ? (t) => `inset 2px 0 0 ${t.palette.text.primary}`
          : undefined,
        cursor: self ? 'default' : 'pointer',
        '&:hover': self ? undefined : { backgroundColor: 'action.selected' },
        ...(seq > 0 && !self ? { animation: `${flash} 1.4s ease-out` } : {}),
      }}
    >
      {self ? '' : empty ? '—' : formatRate(value)}
    </Box>
  );
  if (self) return cell;
  return (
    <Tooltip title={title} arrow placement="top" enterDelay={300}>
      {cell}
    </Tooltip>
  );
};

// The sheet is also the picker: clicking a number selects that DIRECTION
// (hub → asset for a plain column, asset → hub for a banded one) for the
// panels beside it.
const RateMatrix: React.FC<{
  direction: Direction;
  onDirectionChange: (direction: Direction) => void;
}> = ({ direction, onDirectionChange }) => {
  const theme = useTheme();
  const { data: chains } = useChains();
  const { data: crown, dataUpdatedAt, isError } = useCurrentCrown();
  const { settings, update, toggleHidden, toggleFavorite, reset } =
    useMatrixSettings();
  const [panelOpen, setPanelOpen] = useState(false);

  // Hubs first, in das priority order (the same order the rest of the site
  // files pairs under), then every other asset in registry order.
  const hubs = useMemo(() => chains.filter((c) => c.hub), [chains]);
  const allAssets = useMemo(
    () => [...hubs, ...chains.filter((c) => !c.hub)],
    [chains, hubs],
  );
  // Hubs always show as rows; the rest honour hidden and favorites-only.
  const assets = useMemo(
    () =>
      allAssets.filter(
        (a) =>
          a.hub ||
          (!settings.hidden.includes(a.id) &&
            (!settings.favoritesOnly || settings.favorites.includes(a.id))),
      ),
    [allAssets, settings],
  );
  const collapsed = allAssets.length - assets.length;
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

  const linkSx = {
    all: 'unset',
    display: 'block',
    cursor: 'pointer',
    fontFamily: FONTS.mono,
    fontSize: '0.6rem',
    color: 'text.secondary',
    '&:hover': { color: 'text.primary' },
  } as const;

  return (
    <Box
      sx={{
        // The sheet scrolls; header row and asset column stay pinned. On
        // desktop it is the page's own scroller.
        width: '100%',
        height: { xs: 'auto', md: 'calc(100dvh - 56px)' },
        overflow: 'auto',
        '--matrix-flash': alpha(theme.palette.primary.main, 0.28),
      }}
    >
      <Box
        component="table"
        sx={{
          // Columns size to their content; the sheet leaves the rest of the
          // page blank rather than stretching numbers across it, and sits
          // flush against the page's centre rule.
          ml: 'auto',
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
            {/* Corner: live status and the way into settings. */}
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
              <Box
                component="button"
                type="button"
                onClick={() => setPanelOpen((o) => !o)}
                title={
                  collapsed
                    ? `settings · ${collapsed} row${collapsed === 1 ? '' : 's'} hidden`
                    : 'settings'
                }
                sx={{ ...linkSx, mt: 0.125 }}
              >
                settings
                {collapsed > 0 && (
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-block',
                      ml: 0.625,
                      px: 0.5,
                      borderRadius: '7px',
                      backgroundColor: 'border.light',
                      color: 'text.primary',
                      fontSize: '0.56rem',
                      lineHeight: '13px',
                    }}
                  >
                    {collapsed}
                  </Box>
                )}
              </Box>
              {panelOpen && (
                <RateMatrixSettings
                  assets={allAssets.filter((a) => !a.hub)}
                  settings={settings}
                  update={update}
                  toggleHidden={toggleHidden}
                  toggleFavorite={toggleFavorite}
                  reset={reset}
                  onClose={() => setPanelOpen(false)}
                  top={HEAD_H}
                />
              )}
            </Box>
            {hubs.map((hub) => (
              <Box
                component="th"
                key={hub.id}
                colSpan={2}
                title={`${hub.symbol}${hub.network ? ` · ${hub.network}` : ''}\nleft column: you send 1 ${hub.symbol}, you get this much of the row asset\nright column: you get 1 ${hub.symbol}, you send this much of the row asset`}
                sx={{
                  ...pinnedSx,
                  top: 0,
                  zIndex: 1,
                  height: HEAD_H,
                  minWidth: COL_MIN * 2,
                  cursor: 'help',
                  textAlign: logoOnly ? 'center' : 'left',
                  borderBottomColor: 'border.light',
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
                        selected={outDir === direction}
                        title={
                          out === null || out === 0
                            ? 'No quote'
                            : `Send 1 ${hub.symbol}, get ${formatRate(out)} ${asset.symbol}`
                        }
                        seq={seq[`${k}|out`] ?? 0}
                        onSelect={() => onDirectionChange(outDir)}
                      />
                      <Cell
                        value={back}
                        self={self}
                        band
                        selected={backDir === direction}
                        title={
                          back === null || back === 0
                            ? 'No quote'
                            : `Send ${formatRate(back)} ${asset.symbol}, get 1 ${hub.symbol}`
                        }
                        seq={seq[`${k}|back`] ?? 0}
                        onSelect={() => onDirectionChange(backDir)}
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
