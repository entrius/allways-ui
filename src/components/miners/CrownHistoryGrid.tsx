import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import {
  useCrownHistory,
  type CrownHistoryRow,
  type Direction,
} from '../../api';
import { FONTS } from '../../theme';
import CrownIcon from './CrownIcon';

const ROW_BLOCKS = 60;
const CELL_PX = 14;
const RANGE_BLOCKS: Record<string, number> = {
  '1h': 300,
  '2h': 600,
  '4h': 1200,
};
// Subtensor scoring cadence in blocks. The validator sets weights once per
// SCORING_WINDOW, so the 2h grid snaps to multiples of this value to show
// "the actual chunk the validator scored on" rather than a rolling trail.
// Mirrors SCORING_WINDOW_BLOCKS in allways/constants.py.
const SCORING_WINDOW_BLOCKS = 600;
const TIER_PALETTE = ['#0052ff', '#4d7dff', '#7f9eff', '#aebeff', '#d2dafe'];

type CrownRange = '1h' | '2h' | '4h';

type CellState = {
  block: number;
  holderHotkey: string | null;
  holderUid: number | null;
  rate: number;
  isTie: boolean;
  isCurrent: boolean;
  color: string | null;
};

const buildCells = (
  rows: CrownHistoryRow[],
  lo: number,
  hi: number,
  maxBlock: number,
  tiers: Map<string, string>,
  otherColor: string,
): CellState[] => {
  const byBlock = new Map<number, CrownHistoryRow[]>();
  for (const row of rows) {
    const arr = byBlock.get(row.block) ?? [];
    arr.push(row);
    byBlock.set(row.block, arr);
  }
  const cells: CellState[] = [];
  for (let b = lo; b <= hi; b++) {
    const here = byBlock.get(b) ?? [];
    here.sort((a, c) => a.hotkey.localeCompare(c.hotkey));
    const winner = here[0];
    cells.push({
      block: b,
      holderHotkey: winner?.hotkey ?? null,
      holderUid: winner?.uid ?? null,
      rate: winner?.rate ?? 0,
      isTie: here.length > 1,
      isCurrent: b === maxBlock,
      color: winner?.hotkey ? (tiers.get(winner.hotkey) ?? otherColor) : null,
    });
  }
  return cells;
};

const buildTiers = (
  rows: CrownHistoryRow[],
  lo: number,
  hi: number,
): {
  color: Map<string, string>;
  ordered: {
    hotkey: string;
    uid: number | null;
    count: number;
    color: string;
  }[];
} => {
  const counts = new Map<string, { uid: number | null; count: number }>();
  for (const row of rows) {
    if (row.block < lo || row.block > hi) continue;
    const entry = counts.get(row.hotkey);
    if (entry) entry.count += 1;
    else counts.set(row.hotkey, { uid: row.uid ?? null, count: 1 });
  }
  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([hotkey, { uid, count }], idx) => ({
      hotkey,
      uid,
      count,
      color: TIER_PALETTE[idx] ?? '#6b7280',
    }));
  const colorMap = new Map<string, string>();
  for (const { hotkey, color } of sorted) colorMap.set(hotkey, color);
  return { color: colorMap, ordered: sorted };
};

const CrownHistoryGrid: React.FC<{
  direction: Direction;
  onDirectionChange: (d: Direction) => void;
  range: CrownRange;
  onRangeChange: (r: CrownRange) => void;
  pan: number;
  onPanChange: (next: number) => void;
}> = ({
  direction,
  onDirectionChange,
  range,
  onRangeChange,
  pan,
  onPanChange,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  // Theme-aware neutrals — without these, empty/other cells render as
  // near-white on light surfaces and disappear.
  const emptyColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(9,11,13,0.07)';
  const otherColor = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(9,11,13,0.22)';
  const cellHoverOutline = isDark
    ? 'rgba(255,255,255,0.85)'
    : 'rgba(9,11,13,0.85)';

  const [uidSearch, setUidSearch] = useState('');
  // Track whether the active filter came from clicking a legend chip vs.
  // typing in the search box. Only chip-driven filters surface a clear (×)
  // affordance next to the chip itself.
  const [chipFilter, setChipFilter] = useState<string | null>(null);
  const [hover, setHover] = useState<{
    cell: CellState;
    x: number;
    y: number;
  } | null>(null);
  const span = RANGE_BLOCKS[range];

  const { data } = useCrownHistory({
    direction,
    toBlock: pan > 0 ? undefined : undefined,
    fromBlock: undefined,
  });

  const rows = useMemo(() => data ?? [], [data]);
  const maxBlock = useMemo(
    () => (rows.length ? Math.max(...rows.map((r) => r.block)) : 0),
    [rows],
  );
  let hi: number;
  let lo: number;
  if (range === '2h') {
    const anchor =
      Math.floor(maxBlock / SCORING_WINDOW_BLOCKS) * SCORING_WINDOW_BLOCKS;
    const windowsBack = Math.floor(pan / SCORING_WINDOW_BLOCKS);
    lo = Math.max(0, anchor - windowsBack * SCORING_WINDOW_BLOCKS);
    hi = lo + SCORING_WINDOW_BLOCKS - 1;
  } else {
    hi = maxBlock - pan;
    lo = Math.max(0, hi - span + 1);
  }
  const { color: tierColors, ordered: tierLegend } = useMemo(
    () => buildTiers(rows, lo, hi),
    [rows, lo, hi],
  );
  const cells = useMemo(
    () => buildCells(rows, lo, hi, maxBlock, tierColors, otherColor),
    [rows, lo, hi, maxBlock, tierColors, otherColor],
  );

  const rowsCount = Math.ceil(cells.length / ROW_BLOCKS);
  const search = uidSearch.replace(/[^0-9]/g, '');
  const focused = search.length > 0;
  const toggleLegendUid = (uid: number | null) => {
    if (uid == null) return;
    const next = String(uid);
    if (chipFilter === next) {
      setChipFilter(null);
      setUidSearch('');
      return;
    }
    setChipFilter(next);
    setUidSearch(next);
  };
  const onSearchInput = (raw: string) => {
    setUidSearch(raw);
    // Typing breaks the chip-source link — if the user lands on the same uid
    // by hand we still want a plain text filter without the × affordance.
    setChipFilter(null);
  };
  const clearChipFilter = () => {
    setChipFilter(null);
    setUidSearch('');
  };

  return (
    <Box
      sx={{
        position: 'relative',
        backgroundColor: 'surface.light',
        border: '1px solid',
        borderColor: 'divider',
        p: { xs: 2, md: 3 },
        mb: 3,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2.5 }}
      >
        <Stack direction="row" alignItems="baseline" spacing={1.5}>
          <Typography
            variant="monoSmall"
            sx={{
              fontSize: '0.7rem',
              letterSpacing: '0.22em',
              color: 'text.secondary',
            }}
          >
            Crown History
          </Typography>
          <Typography
            variant="mono"
            sx={{
              fontSize: '0.65rem',
              color: 'text.disabled',
            }}
          >
            per block · who held the best rate
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={direction}
            onChange={(_e, v) => v && onDirectionChange(v)}
            sx={{ '& .MuiToggleButton-root': { borderColor: 'divider' } }}
          >
            <ToggleButton
              value="BTC-TAO"
              sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem' }}
            >
              BTC → TAO
            </ToggleButton>
            <ToggleButton
              value="TAO-BTC"
              sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem' }}
            >
              TAO → BTC
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={range}
            onChange={(_e, v) => v && onRangeChange(v)}
          >
            <ToggleButton
              value="1h"
              sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem' }}
            >
              1h
            </ToggleButton>
            <ToggleButton
              value="2h"
              sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem' }}
            >
              2h
            </ToggleButton>
            <ToggleButton
              value="4h"
              sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem' }}
            >
              4h
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          mb: 2,
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          color: 'text.disabled',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            onClick={() =>
              onPanChange(pan + (range === '2h' ? SCORING_WINDOW_BLOCKS : span))
            }
            sx={{ fontFamily: FONTS.mono, fontSize: '0.65rem' }}
          >
            ← earlier
          </Button>
          {pan > 0 && (
            <Button
              variant="text"
              size="small"
              onClick={() => onPanChange(0)}
              sx={{ fontFamily: FONTS.mono, fontSize: '0.65rem' }}
            >
              latest →
            </Button>
          )}
        </Stack>
        <Typography
          component="div"
          variant="mono"
          sx={{ fontSize: '0.7rem', color: 'text.secondary' }}
        >
          {range === '2h' ? (
            <>
              scoring window · block #{lo.toLocaleString()} — #
              {hi.toLocaleString()}
              {pan === 0 && (
                <Box component="span" sx={{ color: 'primary.main', ml: 0.5 }}>
                  · current
                </Box>
              )}
            </>
          ) : (
            <>
              block #{lo.toLocaleString()} — #{hi.toLocaleString()} · last{' '}
              {span} blocks · {range}
            </>
          )}
        </Typography>
        <TextField
          size="small"
          placeholder="highlight uid…"
          value={uidSearch}
          onChange={(e) => onSearchInput(e.target.value)}
          inputProps={{
            style: {
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              padding: '6px 10px',
            },
          }}
          sx={{
            width: 180,
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'surface.main',
            },
            '& fieldset': { borderColor: 'divider' },
          }}
        />
      </Stack>
      <Box
        onMouseLeave={() => setHover(null)}
        sx={{
          display: 'grid',
          gridTemplateColumns: `72px repeat(${ROW_BLOCKS}, 1fr)`,
          gridAutoRows: `${CELL_PX}px`,
          gap: '2px',
        }}
      >
        {Array.from({ length: rowsCount }).map((_, r) => {
          const rowStart = lo + r * ROW_BLOCKS;
          const rowCells = cells.slice(r * ROW_BLOCKS, (r + 1) * ROW_BLOCKS);
          return (
            <React.Fragment key={r}>
              <Box
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.58rem',
                  color: 'text.disabled',
                  letterSpacing: '0.04em',
                  textAlign: 'right',
                  pr: 1,
                  lineHeight: `${CELL_PX}px`,
                }}
              >
                #{rowStart.toLocaleString()}
              </Box>
              {rowCells.map((cell) => {
                const empty = cell.color === null;
                const matchesSearch =
                  focused &&
                  cell.holderUid != null &&
                  String(cell.holderUid) === search;
                const dimmed = focused && !matchesSearch;
                // Current block renders as pending — striped grey, not the
                // provisional winner's tier color. The validator hasn't fully
                // scored this block yet, so the holder is still in flux.
                const pendingStripe = isDark
                  ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.10) 0, rgba(255,255,255,0.10) 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 5px)'
                  : 'repeating-linear-gradient(45deg, rgba(9,11,13,0.14) 0, rgba(9,11,13,0.14) 2px, rgba(9,11,13,0.04) 2px, rgba(9,11,13,0.04) 5px)';
                const baseBg = cell.isCurrent
                  ? pendingStripe
                  : empty
                    ? emptyColor
                    : (cell.color as string);
                return (
                  <Box
                    key={cell.block}
                    onMouseEnter={(e) => {
                      const rect = (
                        e.currentTarget as HTMLElement
                      ).getBoundingClientRect();
                      const parent = (
                        e.currentTarget as HTMLElement
                      ).parentElement?.parentElement?.getBoundingClientRect();
                      setHover({
                        cell,
                        x: rect.left + rect.width / 2 - (parent?.left ?? 0),
                        y: rect.top - (parent?.top ?? 0),
                      });
                    }}
                    sx={{
                      position: 'relative',
                      background: baseBg,
                      opacity: dimmed
                        ? 0.18
                        : empty
                          ? 1
                          : cell.isTie
                            ? 0.78
                            : 1,
                      // Search match: bright inner glow + primary outline so the
                      // hit is unmistakable on any tier color. Plain
                      // `background: primary.main` collapsed the cell into the
                      // outline color in the prior version.
                      outline: matchesSearch
                        ? `1.5px solid ${theme.palette.primary.main}`
                        : 'none',
                      outlineOffset: matchesSearch ? '1px' : 0,
                      boxShadow: matchesSearch
                        ? `inset 0 0 0 1px rgba(255,255,255,0.85)`
                        : 'none',
                      transition:
                        'transform 0.06s, box-shadow 0.06s, background-color 0.22s ease, opacity 0.22s ease',
                      cursor: 'pointer',
                      '&:hover': {
                        outline: `1px solid ${cellHoverOutline}`,
                        outlineOffset: '1px',
                        transform: 'scale(1.6)',
                        zIndex: 5,
                      },
                    }}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
      </Box>

      {hover && <HoverCard hover={hover} isDark={isDark} />}

      {tierLegend.length > 0 && (
        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          flexWrap="wrap"
          alignItems="center"
          sx={{ mt: 2.5 }}
        >
          <Typography
            variant="mono"
            sx={{
              fontSize: '0.58rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mr: 0.5,
            }}
          >
            Holders
          </Typography>
          {tierLegend.map((t) => {
            const active = search === String(t.uid);
            const showClear =
              chipFilter !== null && chipFilter === String(t.uid);
            return (
              <Box
                key={t.hotkey}
                onClick={() => toggleLegendUid(t.uid)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1,
                  py: 0.4,
                  cursor: t.uid != null ? 'pointer' : 'default',
                  border: '1px solid',
                  borderColor: active ? 'primary.main' : 'divider',
                  backgroundColor: active
                    ? 'rgba(0,82,255,0.10)'
                    : 'transparent',
                  fontFamily: FONTS.mono,
                  fontSize: '0.65rem',
                  color: 'text.secondary',
                  transition: 'background-color 0.15s, border-color 0.15s',
                  '&:hover':
                    t.uid != null ? { borderColor: 'text.primary' } : undefined,
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    backgroundColor: t.color,
                    flexShrink: 0,
                  }}
                />
                <Box component="span" sx={{ color: 'text.primary' }}>
                  uid {t.uid ?? '?'}
                </Box>
                <Box component="span" sx={{ color: 'text.disabled' }}>
                  {Math.round((t.count / cells.length) * 100)}%
                </Box>
                {showClear && (
                  <Box
                    component="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearChipFilter();
                    }}
                    aria-label="clear filter"
                    sx={{
                      ml: 0.25,
                      px: 0.5,
                      py: 0,
                      lineHeight: 1,
                      fontSize: '0.75rem',
                      fontFamily: FONTS.mono,
                      color: 'primary.main',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderLeft: '1px solid',
                      borderLeftColor: 'rgba(0,82,255,0.4)',
                      '&:hover': { color: 'text.primary' },
                    }}
                  >
                    clear ×
                  </Box>
                )}
              </Box>
            );
          })}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1,
              py: 0.4,
              border: '1px solid',
              borderColor: 'divider',
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              color: 'text.disabled',
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                backgroundColor: emptyColor,
                flexShrink: 0,
              }}
            />
            <Box component="span">no holder</Box>
          </Box>
        </Stack>
      )}

      {cells.length > 0 && cells.every((c) => c.holderHotkey === null) && (
        <Typography
          component="div"
          variant="mono"
          sx={{
            fontSize: '0.62rem',
            color: 'text.disabled',
            mt: 1.5,
          }}
        >
          no rate activity in this window
        </Typography>
      )}
      <Typography
        component="div"
        variant="mono"
        sx={{
          fontSize: '0.58rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'text.disabled',
          mt: 2,
        }}
      >
        as of #{maxBlock.toLocaleString()} · each cell = 1 block (12s) · each
        row = 60 blocks (12m)
      </Typography>
    </Box>
  );
};

const HoverCard: React.FC<{
  hover: { cell: CellState; x: number; y: number };
  isDark: boolean;
}> = ({ hover, isDark }) => {
  const { cell, x, y } = hover;
  const bg = isDark ? 'rgba(8,10,14,0.97)' : 'rgba(255,255,255,0.98)';
  const border = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(9,11,13,0.18)';
  const shadow = isDark
    ? '0 12px 28px -8px rgba(0,0,0,0.7)'
    : '0 12px 28px -8px rgba(9,11,13,0.25)';
  const dotBg =
    cell.color ?? (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(9,11,13,0.22)');
  return (
    <Box
      sx={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, calc(-100% - 10px))',
        pointerEvents: 'none',
        zIndex: 10,
        minWidth: 168,
        backgroundColor: bg,
        border: '1px solid',
        borderColor: border,
        borderRadius: '4px',
        boxShadow: shadow,
        backdropFilter: 'blur(10px)',
        px: 1.5,
        py: 1.25,
        fontFamily: FONTS.mono,
        fontSize: '0.78rem',
        color: 'text.primary',
        animation: 'crownHoverIn 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
        '@keyframes crownHoverIn': {
          from: { opacity: 0, transform: 'translate(-50%, calc(-100% - 4px))' },
          to: { opacity: 1, transform: 'translate(-50%, calc(-100% - 10px))' },
        },
      }}
    >
      <Stack spacing={0.6}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {cell.holderHotkey ? (
            <Box
              sx={{
                width: 10,
                height: 10,
                backgroundColor: dotBg,
                border: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
              }}
            />
          ) : (
            <Box sx={{ width: 10, height: 10, flexShrink: 0 }} />
          )}
          {cell.holderHotkey ? (
            <Box
              component="span"
              sx={{ fontWeight: 600, color: 'primary.main' }}
            >
              uid {cell.holderUid ?? '?'}
            </Box>
          ) : (
            <Box component="span" sx={{ color: 'text.disabled' }}>
              no holder
            </Box>
          )}
          {cell.holderHotkey && (
            <Box
              component="span"
              sx={{
                ml: 'auto',
                fontSize: '0.65rem',
                color: 'text.disabled',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <CrownIcon size={11} sx={{ color: dotBg, mr: 0 }} />
              crown
            </Box>
          )}
        </Stack>
        <HoverLine label="block" value={`#${cell.block.toLocaleString()}`} />
        {cell.holderHotkey && (
          <HoverLine label="rate" value={cell.rate.toFixed(2)} />
        )}
        {cell.isTie && (
          <HoverLine
            label="status"
            valueColor={isDark ? '#ffcf66' : '#b45309'}
            value="tied"
          />
        )}
        {cell.isCurrent && (
          <HoverLine
            label="status"
            valueColor="text.secondary"
            value="pending"
          />
        )}
      </Stack>
    </Box>
  );
};

const HoverLine: React.FC<{
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}> = ({ label, value, valueColor }) => (
  <Stack direction="row" spacing={1.5} alignItems="baseline">
    <Box
      sx={{
        width: 38,
        color: 'text.secondary',
        fontSize: '0.6rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Box>
    <Box sx={{ color: valueColor ?? 'text.primary', fontWeight: 500 }}>
      {value}
    </Box>
  </Stack>
);

export default CrownHistoryGrid;
