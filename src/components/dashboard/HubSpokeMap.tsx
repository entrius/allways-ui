import React, { useMemo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { chainName, chainSymbol } from '../../utils/format';
import { FONTS } from '../../theme';
import { ChainLogo } from '../ChainLogo';
import RailTooltip from './railTooltip';

// The network's actual shape, drawn: ONE hub at the centre with every chain
// it settles against radiating off it. This is the page's picker — the rail's
// row list is the same set read linearly, so the map answers "what connects
// to what, and where does the value flow" while the list answers "what is
// each route quoting right now".
//
// Edge weight is the corridor's windowed volume in the HUB's units (one
// denomination across the whole map, so thicknesses compare honestly). Both
// directions of a corridor share the one edge — a corridor is a link; the
// two instruments that ride it stay separate rows in the list.

const HUB_LOGO = 46;
const SPOKE_LOGO = 26;
// Edges stop on the hub's ring rather than running under its coin: every one
// of them converges here, and a bundle crossing the artwork reads as noise.
// Matches the ring's outer edge (logo radius + the 3px gap + the 2px stroke).
const HUB_STOP = HUB_LOGO / 2 + 5;

// Every node is a COIN: the logo on a circular plate in the page colour,
// with a hairline edge. Most chain logos are already round discs, but TAO's
// glyph and SOL's bars are not, and an edge running at those just stopped in
// open space beside the artwork. The plate gives every asset the same round
// silhouette to terminate against, and being page-coloured it also hides the
// line behind the mark.
const Coin: React.FC<{ chain: string; size: number }> = ({ chain, size }) => (
  <Box
    sx={{
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: 'background.default',
      border: '1px solid',
      borderColor: 'divider',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
    }}
  >
    <ChainLogo chain={chain} size={size - 2} />
  </Box>
);

type Point = { x: number; y: number };

// Spokes alternate between two radii so 15+ nodes never collide as the
// registry grows.
const ringPoints = (count: number, size: number, stagger: boolean): Point[] => {
  const c = size / 2;
  const outer = c - SPOKE_LOGO / 2 - 13;
  const inner = outer - 30;
  return Array.from({ length: count }, (_, i) => {
    // Start at 12 o'clock and walk clockwise.
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    const r = stagger && i % 2 === 1 ? inner : outer;
    return { x: c + r * Math.cos(angle), y: c + r * Math.sin(angle) };
  });
};

const HubSpokeMap: React.FC<{
  hub: string;
  /** Every chain this hub settles against, in registry order. */
  spokes: string[];
  /** The spoke leg of the page's selected route, if it rides this hub. */
  selected: string | null;
  /** Windowed corridor volume per spoke, in the hub's human units. */
  volumes: Record<string, number>;
  onSelect: (spoke: string) => void;
  /** True when the rail is scoped to this hub rather than showing every one. */
  hubSelected: boolean;
  onSelectHub: (hub: string) => void;
  size?: number;
}> = ({
  hub,
  spokes,
  selected,
  volumes,
  onSelect,
  hubSelected,
  onSelectHub,
  size = 288,
}) => {
  const theme = useTheme();
  const points = useMemo(
    () => ringPoints(spokes.length, size, spokes.length > 8),
    [spokes.length, size],
  );
  const max = useMemo(
    () => Math.max(0, ...spokes.map((s) => volumes[s] ?? 0)),
    [spokes, volumes],
  );
  const c = size / 2;

  // Share of the busiest corridor, square-rooted so a quiet-but-live route
  // still reads as connected rather than vanishing.
  const weight = (spoke: string) =>
    max > 0 ? Math.sqrt((volumes[spoke] ?? 0) / max) : 0;

  // Every coin — hub and spoke alike — is a bare circle the size of its logo
  // with the edges running underneath it. Selection is a ring on the coin,
  // held off the artwork by a background-coloured gap.
  const ring = (on: boolean, gap: number) =>
    on
      ? `0 0 0 ${gap}px ${theme.palette.background.default}, 0 0 0 ${gap + 2}px ${theme.palette.text.primary}`
      : `0 0 0 ${gap}px ${theme.palette.background.default}`;
  const hoverRing = (on: boolean, gap: number) =>
    on
      ? ring(true, gap)
      : `0 0 0 ${gap}px ${theme.palette.background.default}, 0 0 0 ${gap + 1}px ${theme.palette.divider}`;

  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        mx: 'auto',
        flexShrink: 0,
      }}
    >
      <Box
        component="svg"
        viewBox={`0 0 ${size} ${size}`}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {spokes.map((spoke, i) => {
          const w = weight(spoke);
          const on = spoke === selected;
          const { x, y } = points[i];
          // Hub ring to spoke centre. The spoke coin is opaque and painted
          // over the svg, so that end tucks under its logo and the edge
          // reads as running behind it rather than butting up to a box.
          const dx = x - c;
          const dy = y - c;
          const len = Math.hypot(dx, dy) || 1;
          return (
            <line
              key={spoke}
              x1={c + (dx / len) * HUB_STOP}
              y1={c + (dy / len) * HUB_STOP}
              x2={x}
              y2={y}
              stroke={
                on ? theme.palette.text.primary : theme.palette.text.secondary
              }
              strokeWidth={on ? 2 + 2.5 * w : 1 + 2.5 * w}
              strokeOpacity={on ? 0.9 : 0.18 + 0.42 * w}
              strokeLinecap="round"
            />
          );
        })}
      </Box>

      {/* Hub coin — the same object as a spoke, only bigger. No ticker
          printed: every edge converges through this point and would run
          straight through the text, and the scope chip above already names
          the hub. */}
      <RailTooltip
        placement="top"
        title={`${chainName(hub)} hub. Settles all ${spokes.length} corridors drawn here. Click to show only its network.`}
      >
        <Box
          component="button"
          onClick={() => onSelectHub(hub)}
          sx={{
            all: 'unset',
            boxSizing: 'border-box',
            cursor: 'pointer',
            position: 'absolute',
            left: c,
            top: c,
            transform: 'translate(-50%, -50%)',
            width: HUB_LOGO,
            height: HUB_LOGO,
            borderRadius: '50%',
            display: 'block',
            boxShadow: ring(hubSelected, 3),
            transition: 'box-shadow 120ms, transform 120ms',
            '&:hover': {
              transform: 'translate(-50%, -50%) scale(1.08)',
              boxShadow: hoverRing(hubSelected, 3),
            },
          }}
        >
          <Coin chain={hub} size={HUB_LOGO} />
        </Box>
      </RailTooltip>

      {spokes.map((spoke, i) => {
        const on = spoke === selected;
        const { x, y } = points[i];
        // The ticker sits on the far side of the coin from the hub, so the
        // incoming edge never runs through its text.
        const outward = y < c;
        return (
          <RailTooltip
            key={spoke}
            placement="top"
            title={`${chainName(hub)} ⇄ ${chainName(spoke)}. Click to open this corridor, click again to flip the direction.`}
          >
            <Box
              component="button"
              onClick={() => onSelect(spoke)}
              sx={{
                all: 'unset',
                boxSizing: 'border-box',
                cursor: 'pointer',
                position: 'absolute',
                left: x,
                top: y,
                transform: 'translate(-50%, -50%)',
                width: SPOKE_LOGO,
                height: SPOKE_LOGO,
                borderRadius: '50%',
                display: 'block',
                boxShadow: ring(on, 2),
                transition: 'box-shadow 120ms, transform 120ms',
                '&:hover': {
                  transform: 'translate(-50%, -50%) scale(1.12)',
                  boxShadow: hoverRing(on, 2),
                },
              }}
            >
              <Coin chain={spoke} size={SPOKE_LOGO} />
              <Typography
                sx={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  ...(outward
                    ? { bottom: '100%', mb: 0.4 }
                    : { top: '100%', mt: 0.4 }),
                  fontFamily: FONTS.mono,
                  fontSize: '0.55rem',
                  fontWeight: on ? 700 : 500,
                  color: on ? 'text.primary' : 'text.secondary',
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {chainSymbol(spoke)}
              </Typography>
            </Box>
          </RailTooltip>
        );
      })}
    </Box>
  );
};

export default HubSpokeMap;
