import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { useChains, useCompleteSwapHistory, useDirections } from '../../api';
import type { ActiveSwap } from '../../api/models';
import { hubChains } from '../../api/models/chains';
import {
  decomposeDirection,
  type Direction,
} from '../../api/models/MinersDashboard';
import { chainName, chainSymbol } from '../../utils/format';
import { FONTS } from '../../theme';
import { ChainLogo } from '../ChainLogo';
import HubSpokeMap from './HubSpokeMap';
import RailTooltip from './railTooltip';
import { hubLegVolume } from './marketRate';
import { type HeroRange, RANGE_SECS } from './AllwaysMarketRate';

// Does either leg of this route settle on `hub`?
const touchesHub = (direction: Direction, hub: string): boolean => {
  const { from, to } = decomposeDirection(direction);
  return from === hub || to === hub;
};
// The non-hub leg of a route read from one hub's point of view.
const otherLeg = (direction: Direction, hub: string): string => {
  const { from, to } = decomposeDirection(direction);
  return from === hub ? to : from;
};

// One hub's map: its spoke set from the routes themselves (other hubs first
// so every asset keeps its ring position on both maps), edges weighted by
// the window's corridor volume in the hub's units.
const HubMap: React.FC<{
  hub: string;
  hubs: string[];
  directions: Direction[];
  swaps: ActiveSwap[] | undefined;
  secs: number;
  direction: Direction;
  onDirectionChange: (direction: Direction, hub: string) => void;
  size: number;
}> = ({
  hub,
  hubs,
  directions,
  swaps,
  secs,
  direction,
  onDirectionChange,
  size,
}) => {
  const spokes = useMemo(() => {
    const seen: string[] = [];
    for (const d of directions) {
      if (!touchesHub(d, hub)) continue;
      const leg = otherLeg(d, hub);
      if (!seen.includes(leg)) seen.push(leg);
    }
    return [
      ...seen.filter((leg) => hubs.includes(leg)),
      ...seen.filter((leg) => !hubs.includes(leg)),
    ];
  }, [directions, hub, hubs]);

  const volumes = useMemo(() => {
    const out: Record<string, number> = {};
    const cutoff = Date.now() / 1000 - secs;
    for (const s of swaps ?? []) {
      if (
        s.status !== 'COMPLETED' ||
        s.initiatedAt == null ||
        Number(s.initiatedAt) < cutoff
      )
        continue;
      const src = s.sourceChain?.toLowerCase();
      const dst = s.destChain?.toLowerCase();
      if (!src || !dst) continue;
      const leg = src === hub ? dst : dst === hub ? src : null;
      if (!leg) continue;
      const v = hubLegVolume(s, hub);
      if (Number.isFinite(v)) out[leg] = (out[leg] ?? 0) + v;
    }
    return out;
  }, [swaps, hub, secs]);

  const selectedSpoke = touchesHub(direction, hub)
    ? otherLeg(direction, hub)
    : null;
  const count = directions.filter((d) => touchesHub(d, hub)).length;

  // Clicking a spoke opens its corridor hub-first; again flips the
  // instrument. Both directions stay first-class.
  const selectSpoke = (spoke: string) => {
    const forward = `${hub.toUpperCase()}-${spoke.toUpperCase()}` as Direction;
    const reverse = `${spoke.toUpperCase()}-${hub.toUpperCase()}` as Direction;
    onDirectionChange(direction === forward ? reverse : forward, hub);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        minWidth: 0,
      }}
    >
      <RailTooltip
        placement="top"
        title={`${chainName(hub)} settles ${count} of the ${directions.length} routes. Click a coin to open that corridor; again to flip it.`}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            fontFamily: FONTS.mono,
            fontSize: '0.65rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            cursor: 'help',
          }}
        >
          <ChainLogo chain={hub} size={14} />
          {chainSymbol(hub)} hub
          <Box component="span" sx={{ color: 'text.disabled' }}>
            {count}
          </Box>
        </Box>
      </RailTooltip>
      <HubSpokeMap
        hub={hub}
        spokes={spokes}
        selected={selectedSpoke}
        volumes={volumes}
        onSelect={selectSpoke}
        hubSelected={false}
        onSelectHub={() => undefined}
        size={size}
      />
    </Box>
  );
};

/**
 * The network's shape as a desk widget: every hub side by side, each at the
 * centre of the chains it settles against, edges weighted by the window's
 * corridor volume. Clicking a spoke selects that corridor hub-first, and
 * again to flip the direction.
 */
const HubSpokeWidget: React.FC<{
  direction: Direction;
  range: HeroRange;
  onDirectionChange: (direction: Direction, hub: string) => void;
}> = ({ direction, range, onDirectionChange }) => {
  const { data: chains } = useChains();
  const hubs = useMemo(() => hubChains(chains), [chains]);
  const all = useDirections();
  const directions = useMemo<Direction[]>(
    () => (all.includes(direction) ? all : [direction, ...all]),
    [all, direction],
  );
  const { data: swaps } = useCompleteSwapHistory();
  const secs = RANGE_SECS[range];

  if (!hubs.length) return null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${hubs.length}, minmax(0, 1fr))`,
        gap: 2,
        alignItems: 'start',
      }}
    >
      {hubs.map((hub) => (
        <HubMap
          key={hub}
          hub={hub}
          hubs={hubs}
          directions={directions}
          swaps={swaps}
          secs={secs}
          direction={direction}
          onDirectionChange={onDirectionChange}
          size={272}
        />
      ))}
    </Box>
  );
};

export default HubSpokeWidget;
