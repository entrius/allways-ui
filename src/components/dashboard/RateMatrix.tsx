import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { FLASH_ANIMATION } from './flash';
import {
  orderByMarketCap,
  useChains,
  useChainSupply,
  useCompleteSwapHistory,
  useMarketCaps,
  useUsdPrices,
} from '../../api';
import type { ActiveSwap } from '../../api/models/Swaps';
import {
  hubChains,
  hubLeg,
  isAlpha,
  type ChainInfo,
} from '../../api/models/chains';
import {
  decomposeDirection,
  type Direction,
} from '../../api/models/MinersDashboard';
import { formatRate, usdFromHuman, type UsdPrices } from '../../utils/format';
import { hubLegVolume } from './marketRate';
import {
  quotedIds,
  takeableFor,
  useBestTakeable,
  type TakeableMap,
} from './takeable';
import { FONTS } from '../../theme';
import { ChainLogo, NetworkBadge } from '../ChainLogo';
import type { MatrixSettings } from './matrixSettings';

// A spreadsheet of bare numbers, port of allways-matrix into the site's own
// theme. Every ROW is an anchor: the hubs, then every subnet alpha (an alpha
// anchors its pairs with the spokes). Every COLUMN pair is an asset you can
// trade an anchor against: the hubs and the spokes. Alpha↔alpha is not a
// pair, so alphas never become columns, and the sheet grows downward as
// subnets are listed (130 anchors × ~16 assets) instead of sideways. The
// rule never changes: under each asset, the LEFT (plain) column is FROM the
// row anchor, the RIGHT (banded) column is TO it. Every number is in the
// column asset, per 1 unit of the row anchor:
//   left    you send 1 SN7, you get this much of the column asset
//   right   you get 1 SN7, you send this much of the column asset
// Same unit in both columns, so the gap between them is the spread. Tone is
// the only marker; hovering a number or a header spells it out in full.
// Each direction stays its own instrument: no midpoint, no buy/sell.

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

const directionKey = (from: string, to: string): Direction =>
  `${from}-${to}`.toUpperCase() as Direction;

// A cell is the best TAKEABLE rate for its pair: the top of the book for
// that direction. Most pairs have one purse (a spoke pair its hub, every
// alpha pair TAO), so any backing counts. The hub↔hub pair has one per hub
// and sits in both hub rows: the SOL row shows the sol-backed quotes, the
// TAO row the tao-backed ones.
const purseFor = (anchor: ChainInfo, asset: ChainInfo): string | undefined =>
  anchor.hub && asset.hub ? anchor.id : undefined;

const cellRates = (
  anchor: ChainInfo,
  asset: ChainInfo,
  takeable: TakeableMap,
): CellRates => {
  const purse = purseFor(anchor, asset);
  return {
    out: takeableFor(takeable, directionKey(anchor.id, asset.id), purse),
    back: invert(
      takeableFor(takeable, directionKey(asset.id, anchor.id), purse),
    ),
  };
};

// Where a direction lives on the sheet: its row anchor (the alpha leg of an
// alpha pair, else the hub; for hub↔hub, the purse it was picked under) and
// its column asset.
export const matrixCell = (
  direction: Direction,
  base?: string,
): { row: string; col: string } => {
  const { from, to } = decomposeDirection(direction);
  const f = from.toLowerCase();
  const t = to.toLowerCase();
  const row = isAlpha(f)
    ? f
    : isAlpha(t)
      ? t
      : base && (base === f || base === t)
        ? base
        : (hubLeg(f, t) ?? f);
  return { row, col: row === f ? t : f };
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
        {/* Every subnet lives on Bittensor: a network line under each of
            128 rows only doubles the row height. */}
        {network && chain.network && !isAlpha(chain.id) && (
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

// Settled volume per anchor in USD, over every swap das has served: the
// swap's point-in-time dollars where das priced it, else its hub leg at
// today's price. A swap counts toward the row it trades in (the alpha leg of
// an alpha pair, else its hub); a hub↔hub swap used both hubs and counts
// toward both.
const anchorVolumes = (
  swaps: ActiveSwap[] | undefined,
  prices: UsdPrices,
): Map<string, number> => {
  const vol = new Map<string, number>();
  for (const s of swaps ?? []) {
    if (s.status !== 'COMPLETED') continue;
    const src = s.sourceChain?.toLowerCase();
    const dst = s.destChain?.toLowerCase();
    if (!src || !dst) continue;
    const hub = hubLeg(src, dst);
    if (!hub) continue;
    const usd =
      s.usdValue ??
      (isAlpha(hub) ? null : usdFromHuman(hubLegVolume(s, hub), hub, prices));
    if (usd == null || !Number.isFinite(usd) || usd <= 0) continue;
    const rows = isAlpha(src)
      ? [src]
      : isAlpha(dst)
        ? [dst]
        : hubChains().includes(src) && hubChains().includes(dst)
          ? [src, dst]
          : [hub];
    for (const r of rows) vol.set(r, (vol.get(r) ?? 0) + usd);
  }
  return vol;
};

// The sheet's order. Rows (hubs and alphas) by settled volume, the most
// used first; anchors that have never traded keep das order after them
// (hubs in priority, then the subnets by netuid). Every other asset by
// market cap, largest first, with same-asset deployments ordered by their
// chain's supply. Shared with the widget's settings panel so it lists
// entries in the order the sheet shows them.
export const useMatrixAssets = (): ChainInfo[] => {
  const { data: chains } = useChains();
  const { data: caps } = useMarketCaps(chains);
  const { data: supply } = useChainSupply(chains);
  const { data: swaps } = useCompleteSwapHistory();
  const prices = useUsdPrices();
  const volume = useMemo(() => anchorVolumes(swaps, prices), [swaps, prices]);
  return useMemo(() => {
    const ordered = orderByMarketCap(chains, caps, supply);
    const isAnchor = (c: ChainInfo) => c.hub || isAlpha(c.id);
    const anchors = ordered
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => isAnchor(c))
      .sort(
        (a, b) =>
          (volume.get(b.c.id) ?? 0) - (volume.get(a.c.id) ?? 0) || a.i - b.i,
      )
      .map(({ c }) => c);
    return [...anchors, ...ordered.filter((c) => !isAnchor(c))];
  }, [chains, caps, supply, volume]);
};

// The sheet's two axes. Rows are anchors (hubs, then alphas), columns the
// assets an anchor trades against (hubs, then spokes). Hubs sit on both
// axes and always show; everything else honours hidden. Favorites-only
// keeps the starred entries on each axis, hubs included (a hub is starred
// like any other), and an axis with nothing starred keeps its default:
// the hub rows, or every column. With quoted-only and the live quote set
// given, entries nobody is quoting drop out too.
export const matrixAxes = (
  all: ChainInfo[],
  settings: MatrixSettings,
  quoted?: Set<string>,
): { rows: ChainInfo[]; cols: ChainInfo[] } => {
  const shown = all.filter(
    (a) =>
      a.hub ||
      (!settings.hidden.includes(a.id) &&
        (!settings.quotedOnly || !quoted || quoted.has(a.id))),
  );
  const rows = shown.filter((a) => a.hub || isAlpha(a.id));
  const cols = shown.filter((a) => !isAlpha(a.id));
  if (!settings.favoritesOnly) return { rows, cols };
  const starred = (list: ChainInfo[]) =>
    list.filter((a) => settings.favorites.includes(a.id));
  const favRows = starred(rows);
  const favCols = starred(cols);
  return {
    rows: favRows.length ? favRows : rows.filter((a) => a.hub),
    cols: favCols.length ? favCols : cols,
  };
};

// The whole market the sheet can show: every asset, and every direction
// between them (each pair is two instruments; the hub↔hub pair, which sits
// in both hub rows, counts once).
export const matrixUniverse = (
  all: ChainInfo[],
): { assets: number; directions: number } => {
  const { rows, cols } = matrixAxes(all, {
    header: { logo: true, ticker: true, network: true },
    width: 'fit',
    favoritesOnly: false,
    quotedOnly: false,
    maxRows: 0,
    hidden: [],
    favorites: [],
  });
  const pairs = new Set<string>();
  for (const a of rows)
    for (const b of cols)
      if (a.id !== b.id) pairs.add([a.id, b.id].sort().join('|'));
  const ids = new Set([...rows, ...cols].map((a) => a.id));
  return { assets: ids.size, directions: pairs.size * 2 };
};

// Every asset the sheet currently shows, on either axis.
export const visibleAssets = (
  all: ChainInfo[],
  settings: MatrixSettings,
): ChainInfo[] => {
  const { rows, cols } = matrixAxes(all, settings);
  const on = new Set([...rows, ...cols].map((a) => a.id));
  return all.filter((a) => on.has(a.id));
};

// The sheet is also the picker: clicking a number selects that DIRECTION
// (hub → asset for a plain column, asset → hub for a banded one) for the
// panels beside it.
const RateMatrix: React.FC<{
  direction: Direction;
  // The hub row the selection was made in. Only matters for the hub↔hub
  // pair, which appears in both hub rows.
  base?: string;
  onDirectionChange: (direction: Direction, hub: string) => void;
  /** The widget's settings, owned by the page (its gear lives in the
   * widget's title row, outside the sheet). */
  settings: MatrixSettings;
  /** The row stars star and unstar assets in place. */
  toggleFavorite: (id: string) => void;
  /** Reports the sheet's natural width in px (every column at its content
   * width), so the desk can give the widget as many columns as it needs. */
  onNaturalWidth?: (px: number) => void;
  /** Show every row with no cap and fill the parent's height (the full
   * screen view). */
  full?: boolean;
  /** Room (px) the sheet leaves below itself inside the window, so the
   * widgets under it show whole on landing: the sheet takes the window's
   * height less this, up to its row cap, and scrolls the rest. */
  reserveBelow?: number;
}> = ({
  direction,
  base,
  onDirectionChange,
  settings,
  toggleFavorite,
  onNaturalWidth,
  full = false,
  reserveBelow,
}) => {
  const theme = useTheme();
  const { data: chains } = useChains();
  const { map: takeable, miners, dataUpdatedAt, isError } = useBestTakeable();
  // The picked cell's row anchor and column asset, so their headers can
  // light up the way a spreadsheet marks the active cell's row and column.
  const { row: selRow, col: selCol } = matrixCell(direction, base);

  const allAssets = useMatrixAssets();
  // Quoted-only never hides the pair that is picked.
  const quoted = useMemo(() => {
    const ids = quotedIds(takeable);
    ids.add(selRow);
    ids.add(selCol);
    return ids;
  }, [takeable, selRow, selCol]);
  const { rows: anchors, cols: assets } = useMemo(
    () => matrixAxes(allAssets, settings, quoted),
    [allAssets, settings, quoted],
  );
  const allAxes = useMemo(
    () =>
      matrixAxes(allAssets, {
        ...settings,
        hidden: [],
        favoritesOnly: false,
        quotedOnly: false,
      }),
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
    for (const anchor of allAxes.rows)
      for (const a of allAxes.cols)
        if (a.id !== anchor.id)
          m[`${anchor.id}|${a.id}`] = cellRates(anchor, a, takeable);
    return m;
  }, [allAxes, takeable]);
  // Only a fill that FOLLOWS a live one counts as a move: the seed-to-live
  // step would otherwise light every cell at once.
  const prev = useRef<Record<string, CellRates> | null>(null);
  const [seq, setSeq] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!miners) return;
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
  }, [rates, miners]);

  const status = isError
    ? 'offline'
    : dataUpdatedAt
      ? `live ${new Date(dataUpdatedAt).toLocaleTimeString([], {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : 'loading…';

  // Pinned cells are opaque, so rows scrolling under them never show
  // through; a lit header lays its tint over the page colour.
  const pinnedSx = {
    position: 'sticky',
    backgroundColor: 'background.default',
  } as const;
  const litSx = (edge: string) => ({
    backgroundImage: `linear-gradient(${theme.palette.action.selected}, ${theme.palette.action.selected})`,
    boxShadow: `${edge} ${theme.palette.text.primary}`,
  });

  // The sheet's size comes from its rows and columns only. Tall: the
  // header and up to maxRows rows, measured from the rows themselves
  // (a hub row with its network line is taller than a subnet's), then it
  // scrolls. Wide: its natural width goes to the desk, which gives the
  // widget as many columns as that needs, up to the whole desk; past
  // that it scrolls sideways.
  const table = useRef<HTMLTableElement>(null);
  const [maxH, setMaxH] = useState<number | undefined>(undefined);
  // The window's height, so the sheet can leave room for what sits below.
  const [winH, setWinH] = useState(() => window.innerHeight);
  useEffect(() => {
    if (reserveBelow == null) return;
    const on = () => setWinH(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [reserveBelow]);
  const layoutKey = `${anchors.map((a) => a.id).join()}|${assets
    .map((a) => a.id)
    .join()}|${logo}${ticker}${network}|${settings.maxRows}|${dataUpdatedAt}`;
  useLayoutEffect(() => {
    const t = table.current;
    if (!t) return;
    const body = t.tBodies[0];
    const rows = body ? [...body.rows] : [];
    // Full screen and the window-fitted desk sheet show as many rows as
    // their room holds; only a bare sheet keeps the row cap.
    const cap = full || reserveBelow != null ? Infinity : settings.maxRows;
    const last = rows[Math.min(cap, rows.length) - 1];
    const next =
      rows.length > cap && last
        ? last.offsetTop + last.offsetHeight
        : undefined;
    let h = next == null ? undefined : next + 1;
    if (reserveBelow != null && rows.length) {
      // Page offset of the sheet's top, then whatever the window leaves
      // after the reserve, cut to whole rows (at least the hubs and a few
      // subnets) so no row is half shown.
      const top = t.getBoundingClientRect().top + window.scrollY;
      const room = winH - top - reserveBelow;
      const minRows = Math.min(rows.length, 5);
      let fit = rows[minRows - 1];
      for (const row of rows)
        if (row.offsetTop + row.offsetHeight + 1 <= room) fit = row;
      const fitH = fit.offsetTop + fit.offsetHeight + 1;
      if (h == null || fitH < h) h = fitH;
      if (fit === rows[rows.length - 1] && next == null) h = undefined;
    }
    setMaxH(h);
    // Natural width: the table at its content width, read before paint.
    const prevMin = t.style.minWidth;
    t.style.minWidth = '0';
    const natural = t.offsetWidth;
    t.style.minWidth = prevMin;
    onNaturalWidth?.(natural);
  }, [layoutKey, settings.maxRows, onNaturalWidth, full, reserveBelow, winH]);

  return (
    <Box
      sx={{
        // The sheet scrolls inside its widget; the header row and anchor
        // column stay pinned while it scrolls either way.
        width: '100%',
        maxHeight: full ? '100%' : maxH,
        overflow: 'auto',
        // A sideways swipe at the sheet's edge stays in the sheet (no
        // browser back gesture); a vertical one hands on to the page.
        overscrollBehaviorX: 'contain',
        scrollbarWidth: 'thin',
        scrollbarColor: `${theme.palette.border.light} transparent`,
        '&::-webkit-scrollbar': { width: 6, height: 6 },
        '&::-webkit-scrollbar-thumb': {
          background: theme.palette.border.light,
          borderRadius: 0,
        },
        '&::-webkit-scrollbar-corner': { background: 'transparent' },
        '--flash': alpha(theme.palette.primary.main, 0.28),
      }}
    >
      <Box
        component="table"
        ref={table}
        sx={{
          // Content width, stretched to fill the widget: the desk rounds
          // the widget up to whole columns, and the number columns share
          // what is left, never dead space beside the table.
          width: 'max-content',
          minWidth: '100%',
          // Reading across: the row under the pointer is tinted.
          '& tbody tr:hover > td': {
            boxShadow: `inset 0 0 0 999px ${alpha(theme.palette.text.primary, 0.035)}`,
          },
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
          // The widget's own border closes the sheet: no second line at
          // its right and bottom edges.
          '& tr > :last-child': { borderRight: 'none' },
          '& tbody tr:last-child > *': { borderBottom: 'none' },
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
                zIndex: 4,
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
            {assets.map((col) => (
              <Box
                component="th"
                key={col.id}
                colSpan={2}
                title={`${col.symbol}${col.network ? ` · ${col.network}` : ''}\nLeft: send 1 of the row, get this much ${col.symbol}\nRight: get 1 of the row, send this much ${col.symbol}`}
                sx={{
                  ...pinnedSx,
                  top: 0,
                  zIndex: 3,
                  height: HEAD_H,
                  minWidth: COL_MIN * 2,
                  cursor: 'default',
                  textAlign: logoOnly ? 'center' : 'left',
                  borderBottomColor: 'border.light',
                  ...(col.id === selCol ? litSx('inset 0 -2px 0') : {}),
                }}
              >
                <AssetLabel
                  chain={col}
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
          {anchors.map((asset) => {
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
                    ...(asset.id === selRow ? litSx('inset -2px 0 0') : {}),
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
                </Box>
                {assets.map((col) => {
                  // Self and native (TAO↔alpha) cells stay blank.
                  const self =
                    asset.id === col.id ||
                    hubLeg(asset.id, col.id) === null;
                  const k = `${asset.id}|${col.id}`;
                  const r = self ? undefined : rates[k];
                  const out = r?.out ?? null;
                  const back = r?.back ?? null;
                  const outDir = directionKey(asset.id, col.id);
                  const backDir = directionKey(col.id, asset.id);
                  // The page keys a pick by its hub; only hub↔hub needs it.
                  const hub =
                    purseFor(asset, col) ??
                    hubLeg(asset.id, col.id) ??
                    asset.id;
                  const picked = selRow === asset.id && selCol === col.id;
                  return (
                    <React.Fragment key={col.id}>
                      <Cell
                        value={out}
                        self={self}
                        band={false}
                        selected={picked && outDir === direction}
                        seq={seq[`${k}|out`] ?? 0}
                        onSelect={() => onDirectionChange(outDir, hub)}
                      />
                      <Cell
                        value={back}
                        self={self}
                        band
                        selected={picked && backDir === direction}
                        seq={seq[`${k}|back`] ?? 0}
                        onSelect={() => onDirectionChange(backDir, hub)}
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
