import React, { useMemo, useState } from 'react';
import {
  Box,
  Collapse,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { TimeSeriesChart, type ChartSeries } from '../stats';
import RangeChips from '../RangeChips';
import SectionHeading from '../SectionHeading';
import { useDirectionPoolHistory } from '../../api';
import type { PoolHistoryLane } from '../../api/models';
import { hubChains } from '../../api/models/chains';
import { chainSymbol } from '../../utils/format';
import { FONTS } from '../../theme';

/**
 * Emission per hub → pair → lane over time, from the validator-written
 * direction_pools ledger (one point per scoring round). Collapsed it shows one
 * row per hub family; open a hub for its pairs, a pair for its lanes
 * (direction + backing). Every level is a share of miner emission, so a hub is
 * the sum of its pairs and a pair the sum of its lanes at each round — a dead
 * pair (no qualified fill in the pool window) reads as a flat zero, which is
 * the signal a miner needs before standing it up. The one exception: with no
 * pair live anywhere, the validator splits emission equally over the whole
 * registry, so every lane pays while none is live — labelled "fallback".
 *
 * Framed like the other miner panels (Crown Time, the crown rate chart): a
 * hairline box, `SectionHeading` with `RangeChips` on the right, mono data,
 * one ink line per chart.
 */

const RANGES = ['24h', '7d', '30d'] as const;
type EmissionRange = (typeof RANGES)[number];
const RANGE_SECS: Record<EmissionRange, number> = {
  '24h': 86_400,
  '7d': 7 * 86_400,
  '30d': 30 * 86_400,
};

type Node = {
  key: string;
  label: string;
  // Sum of this node's lanes at each round, keyed by round ts (unix s).
  byRound: Map<number, number>;
  // Whether any of this node's pairs was live at each round. Not pool > 0:
  // with no pair live anywhere the validator falls back to an equal split
  // over the whole registry, so every lane pays while none is live.
  liveByRound: Map<number, boolean>;
  children: Node[];
};

const newNode = (key: string, label: string): Node => ({
  key,
  label,
  byRound: new Map(),
  liveByRound: new Map(),
  children: [],
});

const pct = (v: number) => `${v.toFixed(2)}%`;

// Coerce first: ApiUtils hands long floats through as strings (json-bigint
// precision guard) and 1/66-style pool shares are long, so a bare `+` would
// concatenate them into NaN once a pair or hub sums two lanes.
const addPoints = (into: Node, lane: PoolHistoryLane) => {
  for (const p of lane.points) {
    into.byRound.set(p.t, (into.byRound.get(p.t) ?? 0) + Number(p.pool));
    into.liveByRound.set(p.t, (into.liveByRound.get(p.t) ?? false) || p.live);
  }
};

// Pair key: hub leg first so both directions and both backings collapse onto
// one pair row, matching how the validator weights volume (at pair level).
const pairOf = (lane: PoolHistoryLane) => {
  const spoke = lane.hub === lane.from ? lane.to : lane.from;
  return {
    key: `${lane.hub}~${spoke}`,
    label: `${chainSymbol(lane.hub)} ↔ ${chainSymbol(spoke)}`,
  };
};

const laneLabel = (lane: PoolHistoryLane) => {
  const dir = `${chainSymbol(lane.from)} → ${chainSymbol(lane.to)}`;
  // Only a hub↔hub pair has more than one backing; name it where it matters.
  const dual = hubChains().includes(lane.from) && hubChains().includes(lane.to);
  return dual ? `${dir} · ${chainSymbol(lane.backing)} purse` : dir;
};

const newestRound = (n: Node) => {
  const ts = [...n.byRound.keys()];
  return ts.length ? Math.max(...ts) : null;
};

// Share at the newest round on record for this node, as a fraction.
const latestOf = (n: Node) => {
  const t = newestRound(n);
  return t == null ? 0 : (n.byRound.get(t) ?? 0);
};

const latestLive = (n: Node) => {
  const t = newestRound(n);
  return t != null && (n.liveByRound.get(t) ?? false);
};

const buildTree = (lanes: PoolHistoryLane[]): Node[] => {
  const hubs = new Map<string, Node>();
  for (const lane of lanes) {
    let hub = hubs.get(lane.hub);
    if (!hub) {
      hub = newNode(lane.hub, `${chainSymbol(lane.hub)} hub`);
      hubs.set(lane.hub, hub);
    }
    addPoints(hub, lane);
    const pair = pairOf(lane);
    let pairNode = hub.children.find((c) => c.key === pair.key);
    if (!pairNode) {
      pairNode = newNode(pair.key, pair.label);
      hub.children.push(pairNode);
    }
    addPoints(pairNode, lane);
    const laneNode = newNode(
      `${lane.direction}:${lane.backing}`,
      laneLabel(lane),
    );
    addPoints(laneNode, lane);
    pairNode.children.push(laneNode);
  }
  // Hubs in priority order (sol first), pairs and lanes by latest share, largest first.
  const order = hubChains();
  const sortRec = (nodes: Node[]) => {
    nodes.sort((a, b) => latestOf(b) - latestOf(a));
    nodes.forEach((n) => sortRec(n.children));
  };
  const out = [...hubs.values()].sort(
    (a, b) => order.indexOf(a.key) - order.indexOf(b.key),
  );
  out.forEach((h) => sortRec(h.children));
  return out;
};

const seriesFor = (node: Node, color: string): ChartSeries[] => [
  {
    name: node.label,
    color,
    points: [...node.byRound.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, v]) => ({ t: t * 1000, value: v * 100 })),
    formatValue: pct,
  },
];

const NodeRow: React.FC<{
  node: Node;
  depth: number;
  color: string;
  open: Set<string>;
  toggle: (key: string) => void;
}> = ({ node, depth, color, open, toggle }) => {
  const isOpen = open.has(node.key);
  const latest = latestOf(node);
  const live = latestLive(node);
  const expandable = node.children.length > 0;
  // Paying but not live = the silent-network fallback's equal split.
  const status =
    latest <= 0
      ? { text: 'dead', color: 'text.disabled' }
      : live
        ? { text: pct(latest * 100), color: 'text.primary' }
        : { text: `${pct(latest * 100)} · fallback`, color: 'text.secondary' };
  return (
    <Box sx={{ pl: depth * 2 }}>
      <Box
        component={expandable ? 'button' : 'div'}
        type={expandable ? 'button' : undefined}
        onClick={expandable ? () => toggle(node.key) : undefined}
        aria-expanded={expandable ? isOpen : undefined}
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1,
          width: '100%',
          background: 'none',
          border: 0,
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: 0,
          py: 0.75,
          cursor: expandable ? 'pointer' : 'default',
          color: 'inherit',
          textAlign: 'left',
          '&:hover .lane-label, &:focus-visible .lane-label': expandable
            ? { color: 'primary.main' }
            : undefined,
        }}
      >
        <Typography
          className="lane-label"
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.72rem',
            fontWeight: depth === 0 ? 600 : 400,
            color: 'text.primary',
            transition: 'color 120ms',
          }}
        >
          {expandable ? (isOpen ? '▾ ' : '▸ ') : '  '}
          {node.label}
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.72rem',
            fontVariantNumeric: 'tabular-nums',
            color: status.color,
            whiteSpace: 'nowrap',
          }}
        >
          {status.text}
        </Typography>
      </Box>
      <Box sx={{ my: 1 }}>
        <TimeSeriesChart
          series={seriesFor(node, color)}
          height={depth === 0 ? 160 : 120}
          formatValue={pct}
          emptyLabel="no rounds on record"
        />
      </Box>
      {expandable && (
        <Collapse in={isOpen} unmountOnExit>
          <Stack>
            {node.children.map((c) => (
              <NodeRow
                key={c.key}
                node={c}
                depth={depth + 1}
                color={color}
                open={open}
                toggle={toggle}
              />
            ))}
          </Stack>
        </Collapse>
      )}
    </Box>
  );
};

const EmissionsByLane: React.FC = () => {
  const theme = useTheme();
  // Monochrome, matching the crown rate chart beside it.
  const cLine = theme.palette.text.primary;
  const [range, setRange] = useState<EmissionRange>('7d');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const { data, isLoading } = useDirectionPoolHistory(RANGE_SECS[range]);
  const tree = useMemo(() => buildTree(data?.lanes ?? []), [data]);
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        p: { xs: 2, md: 2.5 },
        mb: 3,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1.5 }}
      >
        <SectionHeading
          title="Emission by hub, pair and lane"
          subtitle="share of miner emission per scoring round · open a hub for its pairs, a pair for its lanes"
          info="Share of miner emission each lane's pool paid, per round. Dead: no qualified fill in the window, pays nothing. Fallback: no pair anywhere is live, so the validator splits emission equally across every pair."
        />
        <RangeChips value={range} options={RANGES} onChange={setRange} />
      </Stack>
      {isLoading ? (
        <Stack gap={1.5}>
          {[0, 1].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={160}
              sx={{ bgcolor: 'action.hover' }}
            />
          ))}
        </Stack>
      ) : tree.length === 0 ? (
        <Box
          sx={{
            height: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              color: 'text.secondary',
            }}
          >
            no scoring rounds on record yet
          </Typography>
        </Box>
      ) : (
        <Stack>
          {tree.map((hub) => (
            <NodeRow
              key={hub.key}
              node={hub}
              depth={0}
              color={cLine}
              open={open}
              toggle={toggle}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default EmissionsByLane;
