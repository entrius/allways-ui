import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import {
  useCrownRateHistory,
  useMinerRateHistory,
  type CrownRateHistoryRow,
  type Direction,
} from '../../api';
import { FONTS } from '../../theme';

const PANEL_W = 800;
const PANEL_H = 140;
const ML = 56;
const MR = 56;
const MT = 14;
const MB = 22;
const INNER_W = PANEL_W - ML - MR;
const INNER_H = PANEL_H - MT - MB;

type CrownRange = '1h' | '4h' | '24h' | '4d';

const RANGE_SECS: Record<CrownRange, number> = {
  '1h': 3600,
  '4h': 14_400,
  '24h': 86_400,
  // Matches the API's RATE_MAX_SECS cap — the crown rate line reads
  // crown_holders, which alw-utils prunes, so the widest chip stops at ~4d.
  '4d': 345_600,
};

const DIRECTION_META: Record<
  Direction,
  {
    label: string;
    color: string;
    referenceColor: string;
    gradId: string;
    from: string;
    to: string;
    caption: string;
    valueLeft: boolean;
  }
> = {
  'SOL-BTC': {
    label: 'SOL → BTC',
    color: '#0052ff',
    referenceColor: '#7f9eff',
    gradId: 'solbtcFill',
    from: 'SOL',
    to: 'BTC',
    caption: 'BTC per 1 SOL',
    valueLeft: false,
  },
  'SOL-TAO': {
    label: 'SOL → TAO',
    color: '#f7931a',
    referenceColor: '#fbc77a',
    gradId: 'soltaoFill',
    from: 'SOL',
    to: 'TAO',
    caption: 'TAO per 1 SOL',
    valueLeft: false,
  },
};

const niceTicks = (lo: number, hi: number, count = 4): number[] => {
  if (hi === lo) return [lo];
  const step = (hi - lo) / (count - 1);
  return Array.from({ length: count }, (_, i) => lo + i * step);
};

const fmt = (n: number): string => {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 1) return n.toFixed(2);
  if (abs >= 0.001) return n.toFixed(4);
  return n.toExponential(1);
};

type RateRow = { t: number; rate: number };
type SharedCursor = { t: number; x: number } | null;

type PanelProps = {
  direction: Direction;
  primary: RateRow[];
  reference: RateRow[];
  lo: number;
  head: number;
  isDark: boolean;
  cursor: SharedCursor;
  onCursor: (next: SharedCursor) => void;
};

const RatePanel: React.FC<PanelProps> = ({
  direction,
  primary,
  reference,
  lo,
  head,
  isDark,
  cursor,
  onCursor,
}) => {
  const meta = DIRECTION_META[direction];

  const { yMin, yMax } = useMemo(() => {
    const vals = [
      ...primary.map((p) => p.rate),
      ...reference.map((p) => p.rate),
    ];
    if (!vals.length) return { yMin: 0, yMax: 1 };
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const span = hi - lo;
    const pad = span > 0 ? span * 0.1 : Math.max(Math.abs(hi), 1) * 0.08;
    return { yMin: lo - pad, yMax: hi + pad };
  }, [primary, reference]);

  const mapX = (t: number) =>
    head === lo ? ML : ML + ((t - lo) / (head - lo)) * INNER_W;
  const mapY = (rate: number) =>
    yMax === yMin
      ? MT + INNER_H / 2
      : MT + ((yMax - rate) / (yMax - yMin)) * INNER_H;

  const linePath = (rows: RateRow[]): string => {
    if (!rows.length) return '';
    let d = `M ${mapX(rows[0].t)} ${mapY(rows[0].rate)}`;
    for (let i = 1; i < rows.length; i++) {
      d += ` L ${mapX(rows[i].t)} ${mapY(rows[i].rate)}`;
    }
    return d;
  };

  const areaPath = (rows: RateRow[]): string => {
    if (rows.length < 2) return '';
    const top = linePath(rows);
    const lastX = mapX(rows[rows.length - 1].t);
    const firstX = mapX(rows[0].t);
    const baselineY = MT + INNER_H;
    return `${top} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  };

  const primaryArea = areaPath(primary);
  const primaryLine = linePath(primary);
  const referenceLine = linePath(reference);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !primary.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const viewX = ((e.clientX - rect.left) / rect.width) * PANEL_W;
    if (viewX < ML || viewX > PANEL_W - MR) {
      onCursor(null);
      return;
    }
    const targetT = lo + ((viewX - ML) / INNER_W) * (head - lo);
    let best = primary[0];
    let bestDist = Math.abs(best.t - targetT);
    for (const p of primary) {
      const dist = Math.abs(p.t - targetT);
      if (dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }
    onCursor({ t: best.t, x: mapX(best.t) });
  };

  const ticks = niceTicks(yMin, yMax, 4);

  const hover = useMemo(() => {
    if (!cursor || !primary.length) return null;
    let best = primary[0];
    let bestDist = Math.abs(best.t - cursor.t);
    for (const p of primary) {
      const d = Math.abs(p.t - cursor.t);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return { t: best.t, rate: best.rate };
  }, [cursor, primary]);

  const latest = primary.length ? primary[primary.length - 1].rate : null;

  return (
    <Box sx={{ position: 'relative' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 0.75 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 10,
              height: 10,
              backgroundColor: meta.color,
              flexShrink: 0,
            }}
          />
          <Stack direction="column" spacing={0}>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                color: 'text.secondary',
                lineHeight: 1.2,
              }}
            >
              {meta.label}
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.6rem',
                color: 'text.disabled',
                lineHeight: 1.2,
              }}
            >
              {meta.caption}
            </Typography>
          </Stack>
        </Stack>
        {latest != null && (
          <Stack
            direction="row"
            alignItems="baseline"
            spacing={0.6}
            sx={{ fontFamily: FONTS.mono }}
          >
            {meta.valueLeft ? (
              <>
                <Box
                  component="span"
                  sx={{
                    color: meta.color,
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  {fmt(latest)}
                </Box>
                <Box
                  component="span"
                  sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
                >
                  {meta.from}
                </Box>
                <Box
                  component="span"
                  sx={{ color: 'text.disabled', fontSize: '0.7rem' }}
                >
                  = 1 {meta.to}
                </Box>
              </>
            ) : (
              <>
                <Box
                  component="span"
                  sx={{ color: 'text.disabled', fontSize: '0.7rem' }}
                >
                  1 {meta.from} =
                </Box>
                <Box
                  component="span"
                  sx={{
                    color: meta.color,
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  {fmt(latest)}
                </Box>
                <Box
                  component="span"
                  sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
                >
                  {meta.to}
                </Box>
              </>
            )}
          </Stack>
        )}
      </Stack>
      <Box sx={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${PANEL_W} ${PANEL_H}`}
          preserveAspectRatio="none"
          style={{
            width: '100%',
            height: PANEL_H,
            display: 'block',
            cursor: 'crosshair',
          }}
          onMouseMove={handleMove}
          onMouseLeave={() => onCursor(null)}
        >
          <defs>
            <linearGradient id={meta.gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={meta.color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t, i) => (
            <g key={`tick-${i}`}>
              <line
                x1={ML}
                y1={mapY(t)}
                x2={PANEL_W - MR}
                y2={mapY(t)}
                stroke={
                  isDark ? 'rgba(255,255,255,0.05)' : 'rgba(9,11,13,0.06)'
                }
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={ML - 8}
                y={mapY(t) + 3}
                textAnchor="end"
                fontFamily="DM Mono"
                fontSize="9.5"
                fill={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(9,11,13,0.5)'}
              >
                {fmt(t)}
              </text>
            </g>
          ))}
          <line
            x1={ML}
            y1={MT + INNER_H}
            x2={PANEL_W - MR}
            y2={MT + INNER_H}
            stroke={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(9,11,13,0.18)'}
            vectorEffect="non-scaling-stroke"
          />
          {primaryArea && (
            <path d={primaryArea} fill={`url(#${meta.gradId})`} />
          )}
          {primaryLine && (
            <path
              d={primaryLine}
              fill="none"
              stroke={meta.color}
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {referenceLine && (
            <path
              d={referenceLine}
              fill="none"
              stroke={meta.referenceColor}
              strokeWidth="1.4"
              strokeDasharray="4,3"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {cursor && hover && (
            <g pointerEvents="none">
              <line
                x1={cursor.x}
                y1={MT}
                x2={cursor.x}
                y2={MT + INNER_H}
                stroke={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(9,11,13,0.45)'}
                strokeWidth="1"
                strokeDasharray="2,3"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={cursor.x}
                cy={mapY(hover.rate)}
                r="3.5"
                fill={meta.color}
                stroke={isDark ? '#fff' : '#000'}
                strokeWidth="1"
              />
            </g>
          )}
        </svg>
        {cursor && hover && (
          <Box
            sx={{
              position: 'absolute',
              left: `${(cursor.x / PANEL_W) * 100}%`,
              top: 0,
              transform:
                cursor.x > PANEL_W / 2
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
              {new Date(hover.t * 1000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Box>
            <Stack direction="row" spacing={0.5} alignItems="baseline">
              {meta.valueLeft ? (
                <>
                  <Box
                    component="span"
                    sx={{ color: meta.color, fontWeight: 600 }}
                  >
                    {fmt(hover.rate)}
                  </Box>
                  <Box component="span" sx={{ color: 'text.secondary' }}>
                    {meta.from}
                  </Box>
                  <Box component="span" sx={{ color: 'text.disabled' }}>
                    = 1 {meta.to}
                  </Box>
                </>
              ) : (
                <>
                  <Box component="span" sx={{ color: 'text.disabled' }}>
                    1 {meta.from} =
                  </Box>
                  <Box
                    component="span"
                    sx={{ color: meta.color, fontWeight: 600 }}
                  >
                    {fmt(hover.rate)}
                  </Box>
                  <Box component="span" sx={{ color: 'text.secondary' }}>
                    {meta.to}
                  </Box>
                </>
              )}
            </Stack>
          </Box>
        )}
        {!primary.length && (
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
            no rate history yet
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const CrownRateChart: React.FC<{
  range: CrownRange;
  onRangeChange: (r: CrownRange) => void;
  minerHotkey?: string;
}> = ({ range, onRangeChange, minerHotkey }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const secs = RANGE_SECS[range];
  const minerMode = !!minerHotkey;

  const { data: solBtc } = useCrownRateHistory({
    direction: 'SOL-BTC',
    secs,
  });
  const { data: solTao } = useCrownRateHistory({
    direction: 'SOL-TAO',
    secs,
  });
  const { data: minerRates } = useMinerRateHistory(minerHotkey ?? '');

  // Use reduce instead of `Math.max(...arr)` to avoid spreading large arrays.
  const head = useMemo(() => {
    const maxT = (arr: { t: number }[] | undefined) =>
      (arr ?? []).reduce((m, p) => (p.t > m ? p.t : m), 0);
    return Math.max(maxT(solBtc), maxT(solTao));
  }, [solBtc, solTao]);
  const lo = Math.max(0, head - secs + 1);

  // One memo over all the per-render data shaping so a hover cursor change
  // (which lifts state up here) doesn't re-filter the full window every
  // mouse move.
  const { solBtcCrown, solTaoCrown, solBtcMiner, solTaoMiner } = useMemo(() => {
    const inRange = <T extends { t: number }>(arr: T[] | undefined) =>
      (arr ?? []).filter((p) => p.t >= lo && p.t <= head);
    const strip = (rows: CrownRateHistoryRow[]): RateRow[] =>
      rows.map((r) => ({ t: r.t, rate: r.rate }));
    const minerFor = (direction: Direction): RateRow[] => {
      if (!minerHotkey) return [];
      const from = 'sol';
      const to = direction === 'SOL-BTC' ? 'btc' : 'tao';
      return inRange(minerRates ?? [])
        .filter((r) => r.fromChain === from && r.toChain === to)
        .map((r) => ({ t: r.t, rate: r.rate }));
    };
    return {
      solBtcCrown: strip(inRange(solBtc)),
      solTaoCrown: strip(inRange(solTao)),
      solBtcMiner: minerFor('SOL-BTC'),
      solTaoMiner: minerFor('SOL-TAO'),
    };
  }, [solBtc, solTao, minerRates, minerHotkey, lo, head]);

  const [cursor, setCursor] = useState<SharedCursor>(null);

  const title = minerMode ? 'Miner Rate' : 'Crown Rate';
  const tagline = minerMode
    ? 'this miner · over time · crown shown for reference'
    : 'best rate per direction · over time';

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
        sx={{ mb: 2 }}
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
            {title}
          </Typography>
          <Typography
            variant="mono"
            sx={{ fontSize: '0.65rem', color: 'text.disabled' }}
          >
            {tagline}
          </Typography>
        </Stack>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={range}
          onChange={(_e, v) => v && onRangeChange(v)}
        >
          {(Object.keys(RANGE_SECS) as CrownRange[]).map((r) => (
            <ToggleButton
              key={r}
              value={r}
              sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem' }}
            >
              {r}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <Stack spacing={2.5}>
        <RatePanel
          direction="SOL-BTC"
          primary={minerMode ? solBtcMiner : solBtcCrown}
          reference={minerMode ? solBtcCrown : []}
          lo={lo}
          head={head}
          isDark={isDark}
          cursor={cursor}
          onCursor={setCursor}
        />
        <RatePanel
          direction="SOL-TAO"
          primary={minerMode ? solTaoMiner : solTaoCrown}
          reference={minerMode ? solTaoCrown : []}
          lo={lo}
          head={head}
          isDark={isDark}
          cursor={cursor}
          onCursor={setCursor}
        />
      </Stack>

      <Stack
        direction="row"
        spacing={1.5}
        justifyContent="space-between"
        alignItems="center"
        sx={{
          mt: 2,
          fontFamily: FONTS.mono,
          fontSize: '0.6rem',
          color: 'text.disabled',
        }}
      >
        <Box>
          {lo > 0
            ? new Date(lo * 1000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—'}
        </Box>
        {minerMode && (
          <Stack direction="row" spacing={2} alignItems="center">
            <Stack direction="row" spacing={0.6} alignItems="center">
              <svg width="22" height="6" aria-hidden>
                <line
                  x1="1"
                  y1="3"
                  x2="21"
                  y2="3"
                  stroke="#0052ff"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
              <Box component="span" sx={{ color: 'text.primary' }}>
                miner
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.6} alignItems="center">
              <svg width="22" height="6" aria-hidden>
                <line
                  x1="1"
                  y1="3"
                  x2="21"
                  y2="3"
                  stroke="#7f9eff"
                  strokeWidth="2.2"
                  strokeDasharray="4,3"
                  strokeLinecap="round"
                />
              </svg>
              <Box component="span" sx={{ color: 'text.secondary' }}>
                crown
              </Box>
            </Stack>
          </Stack>
        )}
        <Box>
          {head > 0
            ? new Date(head * 1000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—'}
        </Box>
      </Stack>
    </Box>
  );
};

export default CrownRateChart;
