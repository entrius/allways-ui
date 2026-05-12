import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useCrownRateHistory, useMinerRateHistory } from '../../api';
import type {
  CrownRateHistoryRow,
  Direction,
  MinerRateHistoryRow,
} from '../../api';
import { FONTS } from '../../theme';

const W = 800;
const H = 200;
const ML = 56;
const MR = 84;
const MT = 14;
const MB = 26;
const INNER_W = W - ML - MR;
const INNER_H = H - MT - MB;

type CrownRange = '1h' | '4h' | '24h' | '7d';

const RANGE_BLOCKS: Record<CrownRange, number> = {
  '1h': 300,
  '4h': 1200,
  '24h': 7200,
  '7d': 50_400,
};

const niceTicks = (lo: number, hi: number, count = 5): number[] => {
  if (hi === lo) return [lo];
  const step = (hi - lo) / (count - 1);
  return Array.from({ length: count }, (_, i) => lo + i * step);
};

const CrownRateChart: React.FC<{
  direction: Direction;
  range: CrownRange;
  onRangeChange: (r: CrownRange) => void;
  minerHotkey?: string;
}> = ({ direction, range, onRangeChange, minerHotkey }) => {
  const blocks = RANGE_BLOCKS[range];
  const { data } = useCrownRateHistory({ direction });
  const { data: minerRates } = useMinerRateHistory(minerHotkey ?? '', {});

  const points = data ?? [];
  const head = points.length ? Math.max(...points.map((p) => p.block)) : 0;
  const lo = Math.max(0, head - blocks + 1);
  const windowPoints = useMemo<CrownRateHistoryRow[]>(
    () => points.filter((p) => p.block >= lo && p.block <= head),
    [points, lo, head],
  );

  const minerOverlay = useMemo<MinerRateHistoryRow[]>(() => {
    if (!minerHotkey) return [];
    return (minerRates ?? []).filter(
      (r) =>
        r.fromChain === (direction === 'BTC-TAO' ? 'btc' : 'tao') &&
        r.toChain === (direction === 'BTC-TAO' ? 'tao' : 'btc') &&
        r.block >= lo &&
        r.block <= head,
    );
  }, [minerRates, minerHotkey, direction, lo, head]);

  const allRates = useMemo(
    () => [
      ...windowPoints.map((p) => p.rate),
      ...minerOverlay.map((m) => m.rate),
    ],
    [windowPoints, minerOverlay],
  );
  const yMin = allRates.length ? Math.min(...allRates) - 1 : 0;
  const yMax = allRates.length ? Math.max(...allRates) + 1 : 1;

  const mapX = (block: number) =>
    head === lo ? ML : ML + ((block - lo) / (head - lo)) * INNER_W;
  const mapY = (rate: number) =>
    yMax === yMin
      ? MT + INNER_H / 2
      : MT + ((yMax - rate) / (yMax - yMin)) * INNER_H;

  const crownPath = useMemo(() => {
    if (!windowPoints.length) return '';
    let d = `M ${mapX(windowPoints[0].block)} ${mapY(windowPoints[0].rate)}`;
    for (let i = 1; i < windowPoints.length; i++) {
      d += ` L ${mapX(windowPoints[i].block)} ${mapY(windowPoints[i - 1].rate)} L ${mapX(windowPoints[i].block)} ${mapY(windowPoints[i].rate)}`;
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowPoints, head, lo, yMin, yMax]);

  const minerPath = useMemo(() => {
    if (!minerOverlay.length) return '';
    let d = `M ${mapX(minerOverlay[0].block)} ${mapY(minerOverlay[0].rate)}`;
    for (let i = 1; i < minerOverlay.length; i++) {
      d += ` L ${mapX(minerOverlay[i].block)} ${mapY(minerOverlay[i - 1].rate)} L ${mapX(minerOverlay[i].block)} ${mapY(minerOverlay[i].rate)}`;
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minerOverlay, head, lo, yMin, yMax]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    pt: CrownRateHistoryRow;
  } | null>(null);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !windowPoints.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const viewX = ((e.clientX - rect.left) / rect.width) * W;
    if (viewX < ML || viewX > W - MR) {
      setHover(null);
      return;
    }
    let closest = windowPoints[0];
    let bestDist = Infinity;
    for (const p of windowPoints) {
      const dist = Math.abs(mapX(p.block) - viewX);
      if (dist < bestDist) {
        bestDist = dist;
        closest = p;
      }
    }
    setHover({ x: mapX(closest.block), y: mapY(closest.rate), pt: closest });
  };

  const yTicks = niceTicks(yMin, yMax, 5);

  return (
    <Box
      sx={{
        position: 'relative',
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
        sx={{ mb: 1 }}
      >
        <Typography
          variant="monoSmall"
          sx={{
            fontSize: '0.7rem',
            letterSpacing: '0.22em',
            color: 'text.secondary',
          }}
        >
          Crown Rate · {direction} · per block
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={range}
          onChange={(_e, v) => v && onRangeChange(v)}
        >
          {(Object.keys(RANGE_BLOCKS) as CrownRange[]).map((r) => (
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
      <Box sx={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{
            width: '100%',
            height: 200,
            display: 'block',
            cursor: 'crosshair',
          }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line
                x1={ML}
                y1={mapY(t)}
                x2={W - MR}
                y2={mapY(t)}
                stroke="rgba(255,255,255,0.06)"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={ML - 10}
                y={mapY(t) + 3}
                textAnchor="end"
                fontFamily="DM Mono"
                fontSize="10"
                fill="rgba(255,255,255,0.4)"
              >
                {t.toFixed(0)}
              </text>
            </g>
          ))}
          <text
            x={ML}
            y={H - 8}
            fontFamily="DM Mono"
            fontSize="10"
            fill="rgba(255,255,255,0.4)"
          >
            #{lo.toLocaleString()}
          </text>
          <text
            x={W - MR}
            y={H - 8}
            textAnchor="end"
            fontFamily="DM Mono"
            fontSize="10"
            fill="rgba(255,255,255,0.4)"
          >
            #{head.toLocaleString()}
          </text>
          <line
            x1={ML}
            y1={MT + INNER_H}
            x2={W - MR}
            y2={MT + INNER_H}
            stroke="rgba(255,255,255,0.18)"
            vectorEffect="non-scaling-stroke"
          />
          {crownPath && (
            <path
              d={crownPath}
              fill="none"
              stroke="#0052ff"
              strokeWidth="1.6"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="miter"
            />
          )}
          {minerPath && (
            <path
              d={minerPath}
              fill="none"
              stroke="#90afff"
              strokeWidth="1.4"
              strokeDasharray="3,3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {hover && (
            <g pointerEvents="none">
              <line
                x1={hover.x}
                y1={MT}
                x2={hover.x}
                y2={MT + INNER_H}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1"
                strokeDasharray="2,3"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={hover.x}
                cy={hover.y}
                r="3.5"
                fill="#0052ff"
                stroke="#fff"
                strokeWidth="1"
              />
            </g>
          )}
          {windowPoints.length > 0 && (
            <text
              x={W - MR + 8}
              y={mapY(windowPoints[windowPoints.length - 1].rate) + 3}
              fontFamily="DM Mono"
              fontSize="10"
              fill="#0052ff"
            >
              crown {windowPoints[windowPoints.length - 1].rate}
            </text>
          )}
        </svg>
        {hover && (
          <Box
            sx={{
              position: 'absolute',
              left: `${(hover.x / W) * 100}%`,
              top: 0,
              transform: 'translate(8px, 0)',
              backgroundColor: 'surface.main',
              border: '1px solid',
              borderColor: 'divider',
              p: 1,
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              pointerEvents: 'none',
              zIndex: 5,
              whiteSpace: 'nowrap',
            }}
          >
            <div>
              block <b>#{hover.pt.block.toLocaleString()}</b>
            </div>
            <div>
              crown <b>uid {hover.pt.holderUid ?? '?'}</b> @ {hover.pt.rate}
            </div>
          </Box>
        )}
        {!windowPoints.length && (
          <Typography
            variant="mono"
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.disabled',
              fontSize: '0.75rem',
            }}
          >
            No rate history yet
          </Typography>
        )}
      </Box>
      {minerHotkey && (
        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 1, fontFamily: FONTS.mono, fontSize: '0.7rem' }}
        >
          <span>
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: 14,
                height: 2,
                mr: 0.5,
                backgroundColor: '#0052ff',
              }}
            />
            crown rate
          </span>
          <span>
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: 14,
                height: 2,
                mr: 0.5,
                backgroundColor: '#90afff',
                borderTop: '1px dashed #90afff',
              }}
            />
            miner rate
          </span>
        </Stack>
      )}
    </Box>
  );
};

export default CrownRateChart;
