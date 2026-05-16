import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  useCrownHistory,
  type CrownHistoryRow,
  type Direction,
} from '../../api';
import { FONTS } from '../../theme';
import CrownIcon from './CrownIcon';

// Mirrors SCORING_WINDOW_BLOCKS in allways/constants.py — validator sets
// weights once per cadence, so the 2h grid snaps to multiples and the
// custom-range input caps at the same span.
const SCORING_WINDOW_BLOCKS = 600;
const ROW_BLOCKS = 60;
const CELL_PX = 14;
const RANGE_BLOCKS: Record<string, number> = {
  '1h': 300,
  '2h': SCORING_WINDOW_BLOCKS,
  '4h': 2 * SCORING_WINDOW_BLOCKS,
};
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
  subjectUid: number | null = null,
  subjectColor: string | null = null,
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
    if (subjectUid != null) {
      const mine = here.find((r) => r.uid === subjectUid);
      cells.push({
        block: b,
        holderHotkey: mine?.hotkey ?? null,
        holderUid: mine?.uid ?? null,
        rate: mine?.rate ?? 0,
        isTie: mine != null && here.length > 1,
        isCurrent: b === maxBlock,
        color: mine ? subjectColor : null,
      });
      continue;
    }
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
  // When set, the grid permanently filters to this uid — search input is
  // replaced with a static label, legend chips become non-interactive.
  lockedUid?: number | null;
  // Optional manual block range. When both are set and valid, the grid
  // ignores range/pan and renders the exact [customFrom, customTo] window.
  customFrom?: number | null;
  customTo?: number | null;
  onCustomRangeChange?: (from: number | null, to: number | null) => void;
  // Drop the outer card chrome + header so the parent panel can wrap it.
  embedded?: boolean;
  // Publish the resolved [lo, hi] so the panel can fetch windowed factors
  // that match what's drawn.
  onWindowChange?: (lo: number, hi: number) => void;
}> = ({
  direction,
  onDirectionChange,
  range,
  onRangeChange,
  pan,
  onPanChange,
  lockedUid = null,
  customFrom = null,
  customTo = null,
  onCustomRangeChange,
  embedded = false,
  onWindowChange,
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

  const customActive =
    customFrom != null &&
    customTo != null &&
    customFrom >= 0 &&
    customTo > customFrom &&
    customTo - customFrom <= SCORING_WINDOW_BLOCKS;
  // Local "draft" state for the from/to inputs; syncs back when the URL-
  // driven prop changes (e.g. browser back-button).
  const [customFromInput, setCustomFromInput] = useState(
    customFrom != null ? String(customFrom) : '',
  );
  const [customToInput, setCustomToInput] = useState(
    customTo != null ? String(customTo) : '',
  );
  useEffect(() => {
    setCustomFromInput(customFrom != null ? String(customFrom) : '');
  }, [customFrom]);
  useEffect(() => {
    setCustomToInput(customTo != null ? String(customTo) : '');
  }, [customTo]);
  const customInputError = useMemo(() => {
    if (!customFromInput && !customToInput) return null;
    if (!customFromInput || !customToInput) return 'set both ends';
    const f = Number(customFromInput);
    const t = Number(customToInput);
    if (!Number.isInteger(f) || !Number.isInteger(t) || f < 0 || t < 0)
      return 'block #s must be non-negative integers';
    if (t <= f) return 'to must be > from';
    if (t - f > SCORING_WINDOW_BLOCKS)
      return `range > ${SCORING_WINDOW_BLOCKS} blocks`;
    return null;
  }, [customFromInput, customToInput]);
  const submitCustomRange = () => {
    if (customInputError || !customFromInput || !customToInput) return;
    onCustomRangeChange?.(Number(customFromInput), Number(customToInput));
  };
  const clearCustomRange = () => {
    setCustomFromInput('');
    setCustomToInput('');
    onCustomRangeChange?.(null, null);
  };
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
  const gridRef = useRef<HTMLDivElement | null>(null);
  const span = RANGE_BLOCKS[range];

  const { data } = useCrownHistory({ direction });

  const rows = useMemo(() => data ?? [], [data]);
  const maxBlock = useMemo(
    () => (rows.length ? Math.max(...rows.map((r) => r.block)) : 0),
    [rows],
  );
  let hi: number;
  let lo: number;
  if (customActive) {
    lo = customFrom as number;
    hi = customTo as number;
  } else if (range === '2h') {
    const anchor =
      Math.floor(maxBlock / SCORING_WINDOW_BLOCKS) * SCORING_WINDOW_BLOCKS;
    const windowsBack = Math.floor(pan / SCORING_WINDOW_BLOCKS);
    lo = Math.max(0, anchor - windowsBack * SCORING_WINDOW_BLOCKS);
    hi = lo + SCORING_WINDOW_BLOCKS - 1;
  } else {
    hi = maxBlock - pan;
    lo = Math.max(0, hi - span + 1);
  }
  const atEarliest = lo <= 0;
  useEffect(() => {
    if (maxBlock > 0) onWindowChange?.(lo, hi);
  }, [lo, hi, maxBlock, onWindowChange]);
  const isLocked = lockedUid != null;
  const subjectColor = theme.palette.primary.main;
  const { color: tierColors, ordered: tierLegend } = useMemo(
    () =>
      isLocked ? { color: new Map(), ordered: [] } : buildTiers(rows, lo, hi),
    [rows, lo, hi, isLocked],
  );
  const cells = useMemo(
    () =>
      buildCells(
        rows,
        lo,
        hi,
        maxBlock,
        tierColors,
        otherColor,
        isLocked ? lockedUid : null,
        isLocked ? subjectColor : null,
      ),
    [
      rows,
      lo,
      hi,
      maxBlock,
      tierColors,
      otherColor,
      isLocked,
      lockedUid,
      subjectColor,
    ],
  );

  const rowsCount = Math.ceil(cells.length / ROW_BLOCKS);
  const subjectCellCount = isLocked
    ? cells.reduce((n, c) => n + (c.holderUid === lockedUid ? 1 : 0), 0)
    : 0;
  const subjectAbsent = isLocked && subjectCellCount === 0;
  const search = isLocked
    ? String(lockedUid)
    : uidSearch.replace(/[^0-9]/g, '');
  const focused = search.length > 0;
  const toggleLegendUid = (uid: number | null) => {
    if (uid == null || isLocked) return;
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
        backgroundColor: embedded ? 'transparent' : 'surface.light',
        border: embedded ? 'none' : '1px solid',
        borderColor: 'divider',
        p: embedded ? 0 : { xs: 2, md: 3 },
        mb: embedded ? 0 : 3,
      }}
    >
      <Stack
        direction="row"
        justifyContent={embedded ? 'flex-end' : 'space-between'}
        alignItems="center"
        sx={{ mb: 2.5 }}
      >
        {!embedded && (
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
        )}
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
            disabled={customActive || atEarliest}
            onClick={() =>
              onPanChange(pan + (range === '2h' ? SCORING_WINDOW_BLOCKS : span))
            }
            sx={{ fontFamily: FONTS.mono, fontSize: '0.65rem' }}
          >
            ← earlier
          </Button>
          {!customActive && atEarliest && (
            <Typography
              variant="mono"
              sx={{ fontSize: '0.6rem', color: 'text.disabled' }}
            >
              no earlier data
            </Typography>
          )}
          {!customActive && pan > 0 && (
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
        {isLocked ? (
          <Box
            sx={{
              px: 1.25,
              py: 0.6,
              border: '1px solid',
              borderColor: subjectAbsent ? 'divider' : 'primary.main',
              backgroundColor: subjectAbsent
                ? 'transparent'
                : alpha(theme.palette.primary.main, 0.08),
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              color: subjectAbsent ? 'text.disabled' : 'primary.main',
              letterSpacing: '0.04em',
            }}
          >
            uid {lockedUid} ·{' '}
            {subjectAbsent
              ? 'no crown'
              : `${subjectCellCount}/${cells.length} blocks`}
          </Box>
        ) : (
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
        )}
      </Stack>
      {onCustomRangeChange && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography
            variant="mono"
            sx={{
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mr: 0.5,
            }}
          >
            range
          </Typography>
          <TextField
            size="small"
            placeholder="from #"
            value={customFromInput}
            onChange={(e) =>
              setCustomFromInput(e.target.value.replace(/[^0-9]/g, ''))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCustomRange();
            }}
            inputProps={{
              style: {
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                padding: '5px 9px',
              },
            }}
            sx={{ width: 110 }}
          />
          <Typography
            variant="mono"
            sx={{ fontSize: '0.7rem', color: 'text.disabled' }}
          >
            →
          </Typography>
          <TextField
            size="small"
            placeholder="to #"
            value={customToInput}
            onChange={(e) =>
              setCustomToInput(e.target.value.replace(/[^0-9]/g, ''))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCustomRange();
            }}
            inputProps={{
              style: {
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                padding: '5px 9px',
              },
            }}
            sx={{ width: 110 }}
          />
          {customActive && (
            <Button
              variant="text"
              size="small"
              onClick={clearCustomRange}
              sx={{ fontFamily: FONTS.mono, fontSize: '0.65rem' }}
            >
              × clear range
            </Button>
          )}
          {customInputError ? (
            <Typography
              variant="mono"
              sx={{ fontSize: '0.6rem', color: 'error.main' }}
            >
              {customInputError}
            </Typography>
          ) : (
            (customFromInput || customToInput) &&
            !customActive && (
              <Typography
                variant="mono"
                sx={{ fontSize: '0.6rem', color: 'text.disabled' }}
              >
                press enter to apply
              </Typography>
            )
          )}
        </Stack>
      )}
      <Box sx={{ position: 'relative' }}>
        <Box
          ref={gridRef}
          onMouseLeave={() => setHover(null)}
          sx={{
            display: 'grid',
            gridTemplateColumns: '72px 1fr',
            gap: '2px',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridAutoRows: `${CELL_PX}px`,
              gap: '2px',
            }}
          >
            {Array.from({ length: rowsCount }).map((_, r) => {
              const rowStart = lo + r * ROW_BLOCKS;
              return (
                <Box
                  key={r}
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
              );
            })}
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${ROW_BLOCKS}, 1fr)`,
              gridAutoRows: `${CELL_PX}px`,
              gap: '2px',
              filter: subjectAbsent ? 'blur(2px)' : 'none',
              pointerEvents: subjectAbsent ? 'none' : 'auto',
              transition: 'filter 0.2s ease',
            }}
          >
            {Array.from({ length: rowsCount }).map((_, r) => {
              const rowCells = cells.slice(
                r * ROW_BLOCKS,
                (r + 1) * ROW_BLOCKS,
              );
              return (
                <React.Fragment key={r}>
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
                          const gridRect =
                            gridRef.current?.getBoundingClientRect();
                          setHover({
                            cell,
                            x:
                              rect.left +
                              rect.width / 2 -
                              (gridRect?.left ?? 0),
                            y: rect.top - (gridRect?.top ?? 0),
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
        </Box>
        {subjectAbsent && (
          <Stack
            spacing={0.5}
            alignItems="center"
            sx={{
              position: 'absolute',
              inset: 0,
              justifyContent: 'center',
              pointerEvents: 'none',
              textAlign: 'center',
              px: 2,
            }}
          >
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.85rem',
                color: 'text.primary',
                letterSpacing: '0.04em',
              }}
            >
              no crown time in this scoring window
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.65rem',
                color: 'text.disabled',
                letterSpacing: '0.04em',
              }}
            >
              uid {lockedUid} didn't hold the best rate for any block here
            </Typography>
          </Stack>
        )}
      </Box>

      {!isLocked && tierLegend.length > 0 && (
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
              !isLocked && chipFilter !== null && chipFilter === String(t.uid);
            const interactive = !isLocked && t.uid != null;
            return (
              <Box
                key={t.hotkey}
                component={interactive ? 'button' : 'div'}
                onClick={() => toggleLegendUid(t.uid)}
                aria-pressed={interactive ? active : undefined}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1,
                  py: 0.4,
                  cursor: interactive ? 'pointer' : 'default',
                  border: '1px solid',
                  borderColor: active ? 'primary.main' : 'divider',
                  backgroundColor: active
                    ? alpha(theme.palette.primary.main, 0.1)
                    : 'transparent',
                  fontFamily: FONTS.mono,
                  fontSize: '0.65rem',
                  color: 'text.secondary',
                  transition: 'background-color 0.15s, border-color 0.15s',
                  '&:hover': interactive
                    ? { borderColor: 'text.primary' }
                    : undefined,
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

      {!isLocked &&
        cells.length > 0 &&
        cells.every((c) => c.holderHotkey === null) && (
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
