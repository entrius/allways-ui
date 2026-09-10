import React, { useMemo } from 'react';
import { Box, Grid, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import SectionHeading from '../SectionHeading';
import { useDirectionPoolHistory } from '../../api';
import type { PoolHistoryLane } from '../../api/models';
import { assetLabel, hubChains } from '../../api/models/chains';
import { chainSymbol, formatTimeAgo } from '../../utils/format';
import { FONTS } from '../../theme';

/**
 * Current share of miner emission per hub ↔ spoke pair, from the validator's
 * last flushed scoring round (the direction_pools ledger, narrowed to its
 * newest round). One ink bar per pair, grouped by hub family; hover a bar for
 * its per-direction split. A pair pays only while it cleared a qualified fill
 * in the pool window, so each hub's dead pairs fold into one line beneath it.
 * With no pair live anywhere the validator splits emission equally over the
 * whole registry (the silent-network fallback) — the panel says so rather
 * than painting every pair as live.
 *
 * Rows follow the old network-stats Direction mix: label and share on one
 * line, an 8px bar beneath.
 */

// das windows back from its newest round, so a 1s window is exactly that round.
const LATEST_ROUND_SECS = 1;

type Lane = { key: string; label: string; share: number };
type Pair = {
  key: string;
  label: string;
  spoke: string;
  share: number;
  live: boolean;
  lanes: Lane[];
};
type Hub = { key: string; label: string; share: number; pairs: Pair[] };

const pct = (fraction: number) => `${(fraction * 100).toFixed(2)}%`;

const laneLabel = (lane: PoolHistoryLane) => {
  const dir = `${assetLabel(lane.from)} → ${assetLabel(lane.to)}`;
  // Only a hub↔hub pair has more than one backing; name it where it matters.
  const dual = hubChains().includes(lane.from) && hubChains().includes(lane.to);
  return dual ? `${dir} · ${chainSymbol(lane.backing)} purse` : dir;
};

const buildHubs = (lanes: PoolHistoryLane[]): Hub[] => {
  const hubs = new Map<string, Hub>();
  for (const lane of lanes) {
    const point = lane.points[lane.points.length - 1];
    if (!point) continue;
    // Coerce: ApiUtils hands long floats (a 1/66 share) through as strings.
    const share = Number(point.pool);
    let hub = hubs.get(lane.hub);
    if (!hub) {
      hub = {
        key: lane.hub,
        label: `${chainSymbol(lane.hub)} hub`,
        share: 0,
        pairs: [],
      };
      hubs.set(lane.hub, hub);
    }
    // Hub leg first so both directions and both backings land on one pair,
    // matching how the validator weights volume (at pair level).
    const spoke = lane.hub === lane.from ? lane.to : lane.from;
    const key = `${lane.hub}~${spoke}`;
    let pair = hub.pairs.find((p) => p.key === key);
    if (!pair) {
      pair = {
        key,
        label: `${assetLabel(lane.hub)} ↔ ${assetLabel(spoke)}`,
        spoke,
        share: 0,
        live: false,
        lanes: [],
      };
      hub.pairs.push(pair);
    }
    hub.share += share;
    pair.share += share;
    // `live` is the pair's liveness, carried on each of its lanes.
    pair.live = pair.live || point.live;
    pair.lanes.push({
      key: `${lane.direction}:${lane.backing}`,
      label: laneLabel(lane),
      share,
    });
  }
  const order = hubChains();
  const out = [...hubs.values()].sort(
    (a, b) => order.indexOf(a.key) - order.indexOf(b.key),
  );
  for (const hub of out) {
    hub.pairs.sort(
      (a, b) => b.share - a.share || a.label.localeCompare(b.label),
    );
  }
  return out;
};

const mono = { fontFamily: FONTS.mono, fontSize: '0.72rem' } as const;

const PairBar: React.FC<{ pair: Pair; fallback: boolean }> = ({
  pair,
  fallback,
}) => (
  <Tooltip
    arrow
    placement="top-start"
    enterTouchDelay={0}
    title={
      <Stack gap={0.25}>
        {pair.lanes.map((l) => (
          <Typography key={l.key} sx={{ ...mono, fontSize: '0.68rem' }}>
            {l.label} · {pct(l.share)}
          </Typography>
        ))}
      </Stack>
    }
  >
    <Box sx={{ cursor: 'default', py: 0.25 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 1,
          mb: 0.5,
        }}
      >
        <Typography noWrap sx={{ ...mono, color: 'text.primary' }}>
          {pair.label}
        </Typography>
        <Typography
          sx={{
            ...mono,
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            color: fallback ? 'text.secondary' : 'text.primary',
            whiteSpace: 'nowrap',
          }}
        >
          {pct(pair.share)}
        </Typography>
      </Box>
      <Box sx={{ height: 8, width: '100%', backgroundColor: 'action.hover' }}>
        <Box
          sx={{
            height: '100%',
            // Absolute scale, 0–100% of miner emission: a 3% pair reads as
            // the sliver it is, and a lone live pair fills its bar.
            width: `${Math.min(100, pair.share * 100)}%`,
            // Secondary ink while the fallback pays: nothing here is live.
            backgroundColor: fallback ? 'text.secondary' : 'text.primary',
          }}
        />
      </Box>
    </Box>
  </Tooltip>
);

const HubColumn: React.FC<{ hub: Hub; fallback: boolean }> = ({
  hub,
  fallback,
}) => {
  const paying = hub.pairs.filter((p) => p.share > 0);
  const dead = hub.pairs.filter((p) => p.share <= 0);
  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 0.75,
          mb: 1.25,
        }}
      >
        <Typography sx={{ ...mono, fontWeight: 600, color: 'text.primary' }}>
          {hub.label}
        </Typography>
        <Typography
          sx={{
            ...mono,
            fontVariantNumeric: 'tabular-nums',
            color: hub.share > 0 ? 'text.primary' : 'text.disabled',
          }}
        >
          {hub.share > 0 ? pct(hub.share) : 'dead'}
        </Typography>
      </Box>
      <Stack gap={1}>
        {paying.map((p) => (
          <PairBar key={p.key} pair={p} fallback={fallback} />
        ))}
      </Stack>
      {dead.length > 0 && (
        <Typography
          sx={{
            ...mono,
            fontSize: '0.68rem',
            color: 'text.disabled',
            mt: paying.length ? 1.5 : 0,
          }}
        >
          dead · {dead.map((p) => assetLabel(p.spoke)).join(', ')}
        </Typography>
      )}
    </Box>
  );
};

const EmissionsByPair: React.FC = () => {
  const { data, isLoading } = useDirectionPoolHistory(LATEST_ROUND_SECS);
  const hubs = useMemo(() => buildHubs(data?.lanes ?? []), [data]);
  const pairs = hubs.flatMap((h) => h.pairs);
  const fallback = pairs.some((p) => p.share > 0) && !pairs.some((p) => p.live);

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
      <Box sx={{ mb: 2 }}>
        <SectionHeading
          title="Emission by pair"
          subtitle={
            data?.to != null
              ? `share of miner emission per pair · last scoring round, ${formatTimeAgo(data.to)} · hover a bar for its directions`
              : 'share of miner emission per pair · last scoring round'
          }
          info="Share of miner emission each pair's pool paid in the last scoring round. Dead: no qualified fill in the pool window, pays nothing. Fallback: no pair anywhere is live, so the validator splits emission equally across every pair."
        />
      </Box>
      {isLoading ? (
        <Grid container spacing={3}>
          {[0, 1].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton
                variant="rectangular"
                height={180}
                sx={{ bgcolor: 'action.hover' }}
              />
            </Grid>
          ))}
        </Grid>
      ) : hubs.length === 0 ? (
        <Typography
          sx={{ ...mono, fontSize: '0.7rem', color: 'text.secondary', py: 4 }}
          align="center"
        >
          no scoring rounds on record yet
        </Typography>
      ) : (
        <>
          {fallback && (
            <Typography
              sx={{
                ...mono,
                fontSize: '0.7rem',
                color: 'text.secondary',
                borderLeft: '2px solid',
                borderColor: 'text.secondary',
                pl: 1,
                mb: 2,
              }}
            >
              fallback · no pair cleared a qualified fill in the pool window, so
              the validator is splitting emission equally across every pair
            </Typography>
          )}
          <Grid container spacing={3}>
            {hubs.map((hub) => (
              <Grid item xs={12} md={6} key={hub.key}>
                <HubColumn hub={hub} fallback={fallback} />
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
};

export default EmissionsByPair;
