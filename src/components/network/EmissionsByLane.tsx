import React, { useMemo, useState } from 'react';
import { Box, Collapse, Skeleton, Stack, Typography } from '@mui/material';
import { Panel, TimeSeriesChart, type ChartSeries } from '../stats';
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
 * the signal a miner needs before standing it up.
 */

const RANGES = [
  { label: '24h', seconds: 86_400 },
  { label: '7d', seconds: 7 * 86_400 },
  { label: '30d', seconds: 30 * 86_400 },
] as const;

type Node = {
  key: string;
  label: string;
  // Sum of this node's lanes at each round, keyed by round ts (unix s).
  byRound: Map<number, number>;
  children: Node[];
};

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

const addPoints = (into: Map<number, number>, lane: PoolHistoryLane) => {
  for (const p of lane.points) into.set(p.t, (into.get(p.t) ?? 0) + p.pool);
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

const buildTree = (lanes: PoolHistoryLane[]): Node[] => {
  const hubs = new Map<string, Node>();
  for (const lane of lanes) {
    let hub = hubs.get(lane.hub);
    if (!hub) {
      hub = {
        key: lane.hub,
        label: `${chainSymbol(lane.hub)} hub`,
        byRound: new Map(),
        children: [],
      };
      hubs.set(lane.hub, hub);
    }
    addPoints(hub.byRound, lane);
    const pair = pairOf(lane);
    let pairNode = hub.children.find((c) => c.key === pair.key);
    if (!pairNode) {
      pairNode = {
        key: pair.key,
        label: pair.label,
        byRound: new Map(),
        children: [],
      };
      hub.children.push(pairNode);
    }
    addPoints(pairNode.byRound, lane);
    const laneNode: Node = {
      key: `${lane.direction}:${lane.backing}`,
      label: laneLabel(lane),
      byRound: new Map(),
      children: [],
    };
    addPoints(laneNode.byRound, lane);
    pairNode.children.push(laneNode);
  }
  // Hubs in priority order (sol first), pairs and lanes by latest share, largest first.
  const order = hubChains();
  const latest = (n: Node) => {
    const ts = [...n.byRound.keys()];
    return ts.length ? (n.byRound.get(Math.max(...ts)) ?? 0) : 0;
  };
  const sortRec = (nodes: Node[]) => {
    nodes.sort((a, b) => latest(b) - latest(a));
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
    formatValue: (v: number) => `${v.toFixed(2)}%`,
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
  const ts = [...node.byRound.keys()];
  const latest = ts.length ? (node.byRound.get(Math.max(...ts)) ?? 0) : 0;
  const expandable = node.children.length > 0;
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
          width: '100%',
          background: 'none',
          border: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: 0,
          py: 0.75,
          cursor: expandable ? 'pointer' : 'default',
          color: 'inherit',
          textAlign: 'left',
        }}
      >
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: depth === 0 ? '0.78rem' : '0.72rem',
            fontWeight: depth === 0 ? 600 : 500,
            color: 'text.primary',
          }}
        >
          {expandable ? (isOpen ? '▾ ' : '▸ ') : '  '}
          {node.label}
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.72rem',
            color: latest > 0 ? 'text.primary' : 'text.disabled',
          }}
          title="share of miner emission at the newest round"
        >
          {latest > 0 ? pct(latest) : 'dead'}
        </Typography>
      </Box>
      <Box sx={{ my: 1 }}>
        <TimeSeriesChart
          series={seriesFor(node, color)}
          height={depth === 0 ? 160 : 120}
          formatValue={(v: number) => `${v.toFixed(2)}%`}
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

const EmissionsByLane: React.FC<{ color: string }> = ({ color }) => {
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[1]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const { data, isLoading } = useDirectionPoolHistory(range.seconds);
  const tree = useMemo(() => buildTree(data?.lanes ?? []), [data]);
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Panel
      title="Emission by hub, pair and lane"
      subtitle="share of miner emission each scoring round — open a hub for its pairs, a pair for its lanes"
      info="What each lane's pool paid out of, per scoring round, from the validator's ledger. Pools follow qualified volume: a pair with no qualified fill in the trailing window is dead and pays nothing that round. A hub is the sum of its pairs; a pair the sum of its two directions (and both purses on SOL ↔ TAO)."
      headerRight={
        <Stack direction="row" gap={0.5}>
          {RANGES.map((r) => (
            <Box
              key={r.label}
              component="button"
              type="button"
              onClick={() => setRange(r)}
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.62rem',
                px: 0.75,
                py: 0.25,
                background: 'none',
                border: '1px solid',
                borderColor:
                  r.label === range.label ? 'text.primary' : 'divider',
                color:
                  r.label === range.label ? 'text.primary' : 'text.secondary',
                cursor: 'pointer',
              }}
            >
              {r.label}
            </Box>
          ))}
        </Stack>
      }
    >
      {isLoading ? (
        <Stack gap={1.5} sx={{ mt: 1 }}>
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
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            color: 'text.disabled',
            py: 2,
          }}
        >
          no scoring rounds on record yet
        </Typography>
      ) : (
        <Stack sx={{ mt: 1 }}>
          {tree.map((hub) => (
            <NodeRow
              key={hub.key}
              node={hub}
              depth={0}
              color={color}
              open={open}
              toggle={toggle}
            />
          ))}
        </Stack>
      )}
    </Panel>
  );
};

export default EmissionsByLane;
