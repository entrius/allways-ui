import React, { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { useChains, useCompleteSwapHistory, useDirections } from '../../api';
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

/**
 * The network's shape as a desk widget: one hub at the centre with every
 * chain it settles against radiating off it, edges weighted by the window's
 * corridor volume. A hub chip row picks which hub sits at the centre; with
 * none picked the map follows the selected route's hub. Clicking a spoke
 * selects that corridor hub-first, and again to flip the direction.
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

  // null = follow the selected route's hub.
  const [pinned, setPinned] = useState<string | null>(null);
  const hub = useMemo(
    () =>
      pinned && hubs.includes(pinned)
        ? pinned
        : (hubs.find((h) => touchesHub(direction, h)) ?? hubs[0]),
    [pinned, hubs, direction],
  );

  // The hub's spoke set from the routes themselves; other hubs first so
  // every asset keeps its ring position whichever hub is at the centre.
  const spokes = useMemo(() => {
    if (!hub) return [];
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

  // Corridor volume per spoke over the page's window, in the hub's units.
  const { data: swaps } = useCompleteSwapHistory();
  const secs = RANGE_SECS[range];
  const volumes = useMemo(() => {
    const out: Record<string, number> = {};
    if (!hub) return out;
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

  const selectedSpoke =
    hub && touchesHub(direction, hub) ? otherLeg(direction, hub) : null;

  const selectSpoke = (spoke: string) => {
    if (!hub) return;
    const forward = `${hub.toUpperCase()}-${spoke.toUpperCase()}` as Direction;
    const reverse = `${spoke.toUpperCase()}-${hub.toUpperCase()}` as Direction;
    onDirectionChange(direction === forward ? reverse : forward, hub);
  };

  if (!hub) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {/* Which hub sits at the centre: the site's segmented control. */}
      <Box sx={{ display: 'flex', gap: 0.5, alignSelf: 'flex-start' }}>
        {[null, ...hubs].map((h) => {
          const on = h === pinned;
          const count =
            h == null
              ? directions.length
              : directions.filter((d) => touchesHub(d, h)).length;
          return (
            <RailTooltip
              key={h ?? 'follow'}
              placement="bottom"
              title={
                h == null
                  ? 'Follow the selected route: the map shows whichever hub it settles on.'
                  : `${chainName(h)} settles ${count} of the ${directions.length} routes. Keep it at the centre.`
              }
            >
              <Box
                component="button"
                type="button"
                onClick={() => setPinned(h)}
                aria-pressed={on}
                sx={{
                  all: 'unset',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.6,
                  px: 1,
                  py: 0.4,
                  fontFamily: FONTS.mono,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: on ? 'background.paper' : 'text.secondary',
                  backgroundColor: on ? 'text.primary' : 'transparent',
                  '&:hover': {
                    backgroundColor: on ? 'text.primary' : 'action.hover',
                  },
                }}
              >
                {h == null ? (
                  `All ${count}`
                ) : (
                  <>
                    <ChainLogo chain={h} size={14} />
                    {chainSymbol(h)} hub
                  </>
                )}
              </Box>
            </RailTooltip>
          );
        })}
      </Box>
      <HubSpokeMap
        hub={hub}
        spokes={spokes}
        selected={selectedSpoke}
        volumes={volumes}
        onSelect={selectSpoke}
        hubSelected={pinned === hub}
        onSelectHub={(h) => setPinned(pinned === h ? null : h)}
        size={300}
      />
    </Box>
  );
};

export default HubSpokeWidget;
