import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
  MenuItem,
  Popover,
  Select,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  useDirections,
  directionLabel,
  isDirection,
  useCurrentMinerScores,
  useMinerScores,
  type CurrentMinerScoreRow,
  type Direction,
  type MinerScoreRow,
  type MinerStats,
} from '../../api';
import { FONTS } from '../../theme';
import { formatTimeAgo } from '../../utils/format';
import ScoreBreakdown, { fmtReward } from './ScoreBreakdown';
import RangeChips from '../RangeChips';
import SectionHeading from '../SectionHeading';
import { MOVE_COLORS } from '../dashboard/AllwaysMarketRate';

const PANEL_W = 800;
const PANEL_H = 180;
const ML = 56;
const MR = 64;
const MT = 14;
const MB = 22;
const INNER_W = PANEL_W - ML - MR;
const INNER_H = PANEL_H - MT - MB;

type ScoreSpan = '24h' | '7d' | '30d';

const SPAN_SECS: Record<ScoreSpan, number> = {
  '24h': 86_400,
  '7d': 604_800,
  '30d': 2_592_000,
};

// One aggregated point per roundTs: rewards summed across the directions in
// view ("All pairs" sums every direction; a single pair carries one row).
type Round = {
  t: number;
  total: number;
  rows: MinerScoreRow[];
};

type ScoreRowLike = Pick<MinerScoreRow, 'direction' | 'fromChain' | 'toChain'>;

// Older rows may carry a null direction — reconstruct it from the chain legs.
const rowDirection = (row: ScoreRowLike): Direction | null => {
  if (row.direction) return row.direction;
  const dir = `${row.fromChain}-${row.toChain}`.toUpperCase();
  return isDirection(dir) ? dir : null;
};

const rowLabel = (row: ScoreRowLike): string => {
  const dir = rowDirection(row);
  return dir
    ? directionLabel(dir)
    : `${row.fromChain.toUpperCase()} → ${row.toChain.toUpperCase()}`;
};

const niceTicks = (lo: number, hi: number, count = 4): number[] => {
  if (hi === lo) return [lo];
  const step = (hi - lo) / (count - 1);
  return Array.from({ length: count }, (_, i) => lo + i * step);
};

const fmtTimeTick = (t: number, spanSecs: number): string =>
  spanSecs <= SPAN_SECS['24h']
    ? new Date(t * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date(t * 1000).toLocaleDateString([], {
        month: 'numeric',
        day: 'numeric',
      });

const LegendKey: React.FC<{ color: string; label: string }> = ({
  color,
  label,
}) => (
  <Stack direction="row" spacing={0.6} alignItems="center">
    <Box sx={{ width: 10, height: 10, backgroundColor: color }} />
    <Box
      component="span"
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.65rem',
        color: 'text.secondary',
      }}
    >
      {label}
    </Box>
  </Stack>
);

const GateChip: React.FC<{ state: 'eligible' | 'ineligible' | 'none' }> = ({
  state,
}) => {
  const theme = useTheme();
  // The app's shared semantic green (markets movers, terminal swap statuses),
  // not MUI's default success shade.
  const up = MOVE_COLORS[theme.palette.mode].up;
  const styles =
    state === 'eligible'
      ? {
          color: up,
          borderColor: alpha(up, 0.4),
          backgroundColor: alpha(up, 0.08),
        }
      : {
          color: 'text.disabled',
          borderColor: 'divider',
          backgroundColor: 'action.hover',
        };
  const label =
    state === 'eligible'
      ? '✓ eligible'
      : state === 'ineligible'
        ? '✗ not eligible'
        : 'no scored rounds yet';
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.4,
        border: '1px solid',
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
        ...styles,
      }}
    >
      {label}
    </Box>
  );
};

type ChartHover = { round: Round; x: number } | null;

const ScoreHistoryChart: React.FC<{
  rounds: Round[];
  lo: number;
  hi: number;
  spanSecs: number;
  isDark: boolean;
  onRoundClick: (round: Round, clientX: number, clientY: number) => void;
}> = ({ rounds, lo, hi, spanSecs, isDark, onRoundClick }) => {
  const theme = useTheme();
  // Dot outlines cut against the panel background, which is background.paper
  // like every other stats card.
  const surface = theme.palette.background.paper;
  // Monochrome like the Network Stats charts — the reward line is the theme's
  // primary text shade, not a fixed accent color.
  const lineColor = theme.palette.text.primary;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<ChartHover>(null);

  const yMax = useMemo(() => {
    const max = rounds.reduce((m, r) => Math.max(m, r.total), 0);
    return max > 0 ? max * 1.1 : 1;
  }, [rounds]);

  const mapX = (t: number) =>
    hi === lo ? ML : ML + ((t - lo) / (hi - lo)) * INNER_W;
  const mapY = (v: number) => MT + ((yMax - v) / yMax) * INNER_H;

  const edgePath = (topOf: (r: Round) => number): string => {
    if (!rounds.length) return '';
    let d = `M ${mapX(rounds[0].t)} ${mapY(topOf(rounds[0]))}`;
    for (let i = 1; i < rounds.length; i++) {
      d += ` L ${mapX(rounds[i].t)} ${mapY(topOf(rounds[i]))}`;
    }
    return d;
  };

  const bandPath = (
    topOf: (r: Round) => number,
    bottomOf: (r: Round) => number,
  ): string => {
    if (rounds.length < 2) return '';
    let d = edgePath(topOf);
    for (let i = rounds.length - 1; i >= 0; i--) {
      d += ` L ${mapX(rounds[i].t)} ${mapY(bottomOf(rounds[i]))}`;
    }
    return `${d} Z`;
  };

  const totalTop = (r: Round) => r.total;

  const nearestRound = (clientX: number): Round | null => {
    if (!svgRef.current || !rounds.length) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const viewX = ((clientX - rect.left) / rect.width) * PANEL_W;
    if (viewX < ML || viewX > PANEL_W - MR) return null;
    const targetT = lo + ((viewX - ML) / INNER_W) * (hi - lo);
    let best = rounds[0];
    let bestDist = Math.abs(best.t - targetT);
    for (const r of rounds) {
      const dist = Math.abs(r.t - targetT);
      if (dist < bestDist) {
        best = r;
        bestDist = dist;
      }
    }
    return best;
  };

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const round = nearestRound(e.clientX);
    setHover(round ? { round, x: mapX(round.t) } : null);
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const round = nearestRound(e.clientX);
    if (round) onRoundClick(round, e.clientX, e.clientY);
  };

  const yTicks = niceTicks(0, yMax, 4);
  const xTicks = niceTicks(lo, hi, 4);
  const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(9,11,13,0.06)';
  const axisText = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(9,11,13,0.5)';

  return (
    <Box sx={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${PANEL_W} ${PANEL_H}`}
        preserveAspectRatio="none"
        style={{
          width: '100%',
          height: PANEL_H,
          display: 'block',
          cursor: rounds.length ? 'crosshair' : 'default',
        }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        onClick={handleClick}
      >
        <defs>
          <linearGradient id="scoreCrownFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.24" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => (
          <g key={`ytick-${i}`}>
            <line
              x1={ML}
              y1={mapY(t)}
              x2={PANEL_W - MR}
              y2={mapY(t)}
              stroke={gridStroke}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={ML - 8}
              y={mapY(t) + 3}
              textAnchor="end"
              fontFamily="DM Mono"
              fontSize="9.5"
              fill={axisText}
            >
              {fmtReward(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t, i) => (
          <text
            key={`xtick-${i}`}
            x={mapX(t)}
            y={MT + INNER_H + 14}
            textAnchor={
              i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'
            }
            fontFamily="DM Mono"
            fontSize="9.5"
            fill={axisText}
          >
            {fmtTimeTick(t, spanSecs)}
          </text>
        ))}
        <line
          x1={ML}
          y1={MT + INNER_H}
          x2={PANEL_W - MR}
          y2={MT + INNER_H}
          stroke={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(9,11,13,0.18)'}
          vectorEffect="non-scaling-stroke"
        />
        {rounds.length >= 2 && (
          <>
            <path d={bandPath(totalTop, () => 0)} fill="url(#scoreCrownFill)" />
            <path
              d={edgePath(totalTop)}
              fill="none"
              stroke={lineColor}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
        {rounds.length === 1 && (
          <circle
            cx={mapX(rounds[0].t)}
            cy={mapY(rounds[0].total)}
            r="4"
            fill={lineColor}
            stroke={surface}
            strokeWidth="2"
          />
        )}
        {hover && (
          <g pointerEvents="none">
            <line
              x1={hover.x}
              y1={MT}
              x2={hover.x}
              y2={MT + INNER_H}
              stroke={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(9,11,13,0.45)'}
              strokeWidth="1"
              strokeDasharray="2,3"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={hover.x}
              cy={mapY(hover.round.total)}
              r="3.5"
              fill={lineColor}
              stroke={surface}
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>
      {hover && (
        <Box
          sx={{
            position: 'absolute',
            left: `${(hover.x / PANEL_W) * 100}%`,
            top: 0,
            transform:
              hover.x > PANEL_W / 2
                ? 'translate(calc(-100% - 6px), 0)'
                : 'translate(6px, 0)',
            backgroundColor: isDark
              ? 'rgba(8,10,14,0.97)'
              : 'rgba(255,255,255,0.98)',
            border: '1px solid',
            borderColor: 'divider',
            px: 1,
            py: 0.5,
            fontFamily: FONTS.mono,
            fontSize: '0.65rem',
            pointerEvents: 'none',
            zIndex: 5,
            whiteSpace: 'nowrap',
            color: 'text.primary',
          }}
        >
          <Box sx={{ color: 'text.disabled', fontSize: '0.6rem', mb: 0.25 }}>
            {new Date(hover.round.t * 1000).toLocaleString([], {
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {' · click for breakdown'}
          </Box>
          <Stack direction="row" spacing={0.75} alignItems="baseline">
            <Box component="span" sx={{ fontWeight: 600 }}>
              {fmtReward(hover.round.total)}
            </Box>
            <Box component="span" sx={{ color: 'text.disabled' }}>
              reward
            </Box>
          </Stack>
        </Box>
      )}
      {!rounds.length && (
        <Typography
          variant="mono"
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.disabled',
            fontSize: '0.7rem',
          }}
        >
          no scored rounds in range
        </Typography>
      )}
    </Box>
  );
};

const ALL_PAIRS = 'all';

const ScoringPanel: React.FC<{
  hotkey: string;
  stats: MinerStats | undefined;
  direction: Direction | null;
  onDirectionChange: (d: Direction | null) => void;
}> = ({ hotkey, stats, direction, onDirectionChange }) => {
  const theme = useTheme();
  const directions = useDirections();
  const isDark = theme.palette.mode === 'dark';

  const [span, setSpan] = useState<ScoreSpan>('7d');
  const spanSecs = SPAN_SECS[span];
  // Recomputed only when the span changes so the query key stays stable.
  const { fromTs, toTs } = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return { fromTs: now - SPAN_SECS[span], toTs: now };
  }, [span]);

  const { data: history } = useMinerScores(hotkey, {
    direction: direction ?? undefined,
    fromTs,
  });
  const { data: tip } = useCurrentMinerScores(hotkey);

  const tipRows = useMemo(
    () =>
      (tip ?? []).filter(
        (r) => direction == null || rowDirection(r) === direction,
      ),
    [tip, direction],
  );

  const rounds = useMemo<Round[]>(() => {
    const byT = new Map<number, Round>();
    for (const row of history ?? []) {
      const round = byT.get(row.roundTs) ?? {
        t: row.roundTs,
        total: 0,
        rows: [],
      };
      round.total += Number(row.reward);
      round.rows.push(row);
      byT.set(row.roundTs, round);
    }
    return [...byT.values()].sort((a, b) => a.t - b.t);
  }, [history]);

  // Gate reads the live tip; falls back to the most recent history row (rows
  // arrive roundTs ASC) so a miner between crowns still shows its last state.
  const gateState: 'eligible' | 'ineligible' | 'none' = useMemo(() => {
    if (tipRows.length) {
      return tipRows.every((r) => r.eligible) ? 'eligible' : 'ineligible';
    }
    const lastRows = history?.length ? rounds[rounds.length - 1]?.rows : null;
    if (lastRows?.length) {
      return lastRows.every((r) => r.eligible) ? 'eligible' : 'ineligible';
    }
    return 'none';
  }, [tipRows, history, rounds]);

  const tipAgeTs = tipRows.reduce((m, r) => Math.max(m, r.ts), 0);

  const [popover, setPopover] = useState<{
    top: number;
    left: number;
    round: Round;
  } | null>(null);

  const sortedTipRows = useMemo(() => {
    const order = (r: CurrentMinerScoreRow) => {
      const dir = rowDirection(r);
      const idx = dir ? directions.indexOf(dir) : -1;
      return idx === -1 ? directions.length : idx;
    };
    return [...tipRows].sort((a, b) => order(a) - order(b));
  }, [tipRows, directions]);

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        p: { xs: 2, md: 3 },
        mb: 3,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1.5 }}
      >
        <SectionHeading
          title="Scoring"
          subtitle="validator score snapshots per round"
        />
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Select
            size="small"
            value={direction ?? ALL_PAIRS}
            onChange={(e) => {
              const v = e.target.value as string;
              onDirectionChange(isDirection(v) ? v : null);
            }}
            sx={{
              width: 150,
              height: 30,
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
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
              value={ALL_PAIRS}
              sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem' }}
            >
              All pairs
            </MenuItem>
            {directions.map((d) => (
              <MenuItem
                key={d}
                value={d}
                sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem' }}
              >
                {directionLabel(d)}
              </MenuItem>
            ))}
          </Select>
          <RangeChips
            value={span}
            options={Object.keys(SPAN_SECS) as ScoreSpan[]}
            onChange={setSpan}
          />
        </Stack>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
        <GateChip state={gateState} />
        {stats && (
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              color: 'text.disabled',
            }}
          >
            {stats.completedSwaps} completed · {stats.timedOutSwaps} timed out
          </Typography>
        )}
      </Stack>

      <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mb: 1 }}>
        <Typography
          variant="monoSmall"
          sx={{
            fontSize: '0.6rem',
            letterSpacing: '0.18em',
            color: 'text.disabled',
          }}
        >
          This Round
        </Typography>
        {tipAgeTs > 0 && (
          <Typography
            variant="mono"
            sx={{ fontSize: '0.6rem', color: 'text.disabled' }}
          >
            snapshot {formatTimeAgo(tipAgeTs)}
          </Typography>
        )}
      </Stack>
      {sortedTipRows.length === 0 ? (
        <Typography
          variant="mono"
          sx={{ fontSize: '0.7rem', color: 'text.disabled', mb: 2.5 }}
        >
          no live round · miner holds no crown right now
        </Typography>
      ) : (
        <Stack spacing={0.5} sx={{ mb: 2.5 }}>
          {sortedTipRows.map((row) => (
            <ScoreBreakdown
              key={`${row.fromChain}-${row.toChain}`}
              row={row}
              label={rowLabel(row)}
            />
          ))}
        </Stack>
      )}

      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        <Stack direction="row" alignItems="baseline" spacing={1.5}>
          <Typography
            variant="monoSmall"
            sx={{
              fontSize: '0.6rem',
              letterSpacing: '0.18em',
              color: 'text.disabled',
            }}
          >
            History
          </Typography>
          <Typography
            variant="mono"
            sx={{ fontSize: '0.6rem', color: 'text.disabled' }}
          >
            reward per round
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2}>
          <LegendKey color={theme.palette.text.primary} label="reward" />
        </Stack>
      </Stack>

      <ScoreHistoryChart
        rounds={rounds}
        lo={fromTs}
        hi={toTs}
        spanSecs={spanSecs}
        isDark={isDark}
        onRoundClick={(round, clientX, clientY) =>
          setPopover({ top: clientY, left: clientX, round })
        }
      />

      <Popover
        open={!!popover}
        anchorReference="anchorPosition"
        anchorPosition={
          popover ? { top: popover.top, left: popover.left } : undefined
        }
        onClose={() => setPopover(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'surface.elevated',
              backgroundImage: 'none',
              px: 2,
              py: 1.5,
              maxWidth: 560,
            },
          },
        }}
      >
        {popover && (
          <Stack spacing={1}>
            <Typography
              variant="mono"
              sx={{ fontSize: '0.65rem', color: 'text.secondary' }}
            >
              round ·{' '}
              {new Date(popover.round.t * 1000).toLocaleString([], {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Typography>
            {popover.round.rows.map((row) => (
              <ScoreBreakdown
                key={`${row.roundTs}-${row.fromChain}-${row.toChain}`}
                row={row}
                label={rowLabel(row)}
              />
            ))}
            {popover.round.rows.length > 1 && (
              <Typography
                variant="mono"
                sx={{ fontSize: '0.7rem', color: 'text.secondary' }}
              >
                total{' '}
                <Box
                  component="span"
                  sx={{ color: 'text.primary', fontWeight: 600 }}
                >
                  {fmtReward(popover.round.total)}
                </Box>
              </Typography>
            )}
          </Stack>
        )}
      </Popover>
    </Box>
  );
};

export default ScoringPanel;
