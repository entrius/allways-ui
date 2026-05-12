import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  useCrownHistory,
  type CrownHistoryRow,
  type Direction,
} from '../../api';
import { FONTS } from '../../theme';

const ROW_BLOCKS = 60;
const RANGE_BLOCKS: Record<string, number> = { '1h': 300, '2h': 600, '4h': 1200 };
// Subtensor scoring cadence in blocks. The validator sets weights once per
// SCORING_WINDOW, so the 2h grid snaps to multiples of this value to show
// "the actual chunk the validator scored on" rather than a rolling trail.
// Mirrors SCORING_WINDOW_BLOCKS in allways/constants.py.
const SCORING_WINDOW_BLOCKS = 600;
const TIER_PALETTE = ['#0052ff', '#4d7dff', '#7f9eff', '#aebeff', '#d2dafe'];
const OTHER_COLOR = 'rgba(255,255,255,0.18)';
const EMPTY_COLOR = 'rgba(255,255,255,0.05)';

type CrownRange = '1h' | '2h' | '4h';

type CellState = {
  block: number;
  holderHotkey: string | null;
  holderUid: number | null;
  rate: number;
  isTie: boolean;
};

const buildCells = (
  rows: CrownHistoryRow[],
  lo: number,
  hi: number,
): CellState[] => {
  // Group rows by block. When >1 holder, mark as tie and pick the
  // alphabetically-first as the visible representative.
  const byBlock = new Map<number, CrownHistoryRow[]>();
  for (const row of rows) {
    const arr = byBlock.get(row.block) ?? [];
    arr.push(row);
    byBlock.set(row.block, arr);
  }
  const cells: CellState[] = [];
  for (let b = lo; b <= hi; b++) {
    const here = byBlock.get(b) ?? [];
    here.sort((a, b) => a.hotkey.localeCompare(b.hotkey));
    const winner = here[0];
    cells.push({
      block: b,
      holderHotkey: winner?.hotkey ?? null,
      holderUid: winner?.uid ?? null,
      rate: winner?.rate ?? 0,
      isTie: here.length > 1,
    });
  }
  return cells;
};

const buildTiers = (cells: CellState[]): Map<string, string> => {
  const counts = new Map<string, number>();
  for (const cell of cells) {
    if (cell.holderHotkey) {
      counts.set(cell.holderHotkey, (counts.get(cell.holderHotkey) ?? 0) + 1);
    }
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const map = new Map<string, string>();
  sorted.forEach(([hotkey], idx) => {
    map.set(hotkey, TIER_PALETTE[idx] ?? OTHER_COLOR);
  });
  return map;
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
  const [uidSearch, setUidSearch] = useState('');
  const span = RANGE_BLOCKS[range];

  const { data } = useCrownHistory({
    direction,
    // The API resolves missing bounds to "last DEFAULT blocks", so we only
    // pass explicit bounds when panning.
    toBlock: pan > 0 ? undefined : undefined,
    fromBlock: undefined,
  });

  const rows = useMemo(() => data ?? [], [data]);
  const maxBlock = useMemo(
    () => (rows.length ? Math.max(...rows.map((r) => r.block)) : 0),
    [rows],
  );
  // 2h snaps to the validator's scoring boundary so the grid renders the
  // actual chunk weights were set on. 1h and 4h stay as rolling windows.
  let hi: number;
  let lo: number;
  if (range === '2h') {
    const anchor = Math.floor(maxBlock / SCORING_WINDOW_BLOCKS) * SCORING_WINDOW_BLOCKS;
    const windowsBack = Math.floor(pan / SCORING_WINDOW_BLOCKS);
    lo = Math.max(0, anchor - windowsBack * SCORING_WINDOW_BLOCKS);
    hi = lo + SCORING_WINDOW_BLOCKS - 1;
  } else {
    hi = maxBlock - pan;
    lo = Math.max(0, hi - span + 1);
  }
  const cells = useMemo(() => buildCells(rows, lo, hi), [rows, lo, hi]);
  const tiers = useMemo(() => buildTiers(cells), [cells]);

  const rowsCount = Math.ceil(cells.length / ROW_BLOCKS);
  const search = uidSearch.replace(/[^0-9]/g, '');
  const focused = search.length > 0;

  return (
    <Box
      sx={{
        backgroundColor: 'surface.light',
        border: '1px solid',
        borderColor: 'divider',
        p: 2.5,
        mb: 3,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography
          variant="monoSmall"
          sx={{
            fontSize: '0.7rem',
            letterSpacing: '0.22em',
            color: 'text.secondary',
          }}
        >
          Crown History · per block
        </Typography>
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
          mb: 1.5,
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
          {range === '2h' && pan > 0 && (
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
          onChange={(e) => setUidSearch(e.target.value)}
          inputProps={{
            style: {
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              padding: '6px 10px',
            },
          }}
          sx={{ width: 180, '& fieldset': { borderColor: 'divider' } }}
        />
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `72px repeat(${ROW_BLOCKS}, 1fr)`,
          gridAutoRows: '12px',
          gap: '2px',
          opacity: focused ? 1 : 1,
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
                  lineHeight: '12px',
                }}
              >
                #{rowStart.toLocaleString()}
              </Box>
              {rowCells.map((cell) => {
                const isCurrent = cell.block === maxBlock;
                const color = cell.holderHotkey
                  ? (tiers.get(cell.holderHotkey) ?? OTHER_COLOR)
                  : EMPTY_COLOR;
                const matchesSearch =
                  focused &&
                  cell.holderUid != null &&
                  String(cell.holderUid) === search;
                const dimmed = focused && !matchesSearch;
                return (
                  <Box
                    key={cell.block}
                    title={
                      cell.holderHotkey
                        ? `block #${cell.block.toLocaleString()} · uid ${cell.holderUid ?? '?'} @ ${cell.rate}${cell.isTie ? ' · tied' : ''}`
                        : `block #${cell.block.toLocaleString()} · no holder`
                    }
                    sx={{
                      background: isCurrent
                        ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 2px, rgba(255,255,255,0.22) 2px, rgba(255,255,255,0.22) 4px)'
                        : matchesSearch
                          ? 'primary.main'
                          : color,
                      outline: matchesSearch ? '1px solid' : 'none',
                      outlineColor: 'primary.main',
                      opacity: dimmed ? 0.18 : cell.isTie ? 0.7 : 1,
                      transition: 'transform 0.06s',
                      cursor: 'pointer',
                      '&:hover': {
                        outline: '1px solid',
                        outlineColor: 'text.primary',
                        transform: 'scale(1.4)',
                        zIndex: 5,
                        position: 'relative',
                      },
                    }}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
      </Box>
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

export default CrownHistoryGrid;
