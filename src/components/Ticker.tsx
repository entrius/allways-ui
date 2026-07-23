import React from 'react';
import { Box, useMediaQuery } from '@mui/material';

// Wall-street tape: the segments crawl across one line at a constant pace on
// EVERY breakpoint. Hover (or tap) pauses the tape so a moving rate can be
// read; prefers-reduced-motion degrades to a static, hand-scrollable row (no
// animation at all).
//
// The crawl is a requestAnimationFrame loop writing a transform straight to
// the track element — deliberately NOT a CSS keyframe animation. Keyframes
// here would need the slide distance baked into the definition, so every
// live rate update that nudges a segment's width would mint new keyframes
// and RESTART the animation (visible stutter, and eventually a dead tape).
// The rAF loop instead keeps one offset, wraps it modulo the measured
// copy-width (content changes stay seamless), never touches React state per
// frame (zero re-renders), moves only `transform` (compositor-only, no
// layout/paint), and is auto-throttled by the browser in background tabs —
// the elapsed-time clamp keeps resume jump-free.
//
// Shared by the market page (RatesTicker) and the miners page
// (StickyNetworkHeader) so the two tapes scroll identically.

const GAP = 3; // theme spacing between segments

// ~30 px/s is a steady broadcast-ticker crawl.
const PX_PER_SEC = 30;
// Clamp per-frame elapsed time (seconds) so returning from a background tab
// advances one small step instead of leaping the accumulated gap.
const MAX_FRAME_SEC = 0.1;

// One pass of the segments. The track holds enough identical copies to
// cover the viewport PLUS one spare, so some copy occupies every pixel at
// every point in the cycle — no blank tail, however narrow the content or
// wide the screen.
const COPY_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: GAP,
  pr: GAP,
  '& > *': { flexShrink: 0 },
} as const;

const Ticker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const items = React.Children.toArray(children);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');

  const containerRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const copyRef = React.useRef<HTMLDivElement>(null);

  // Pause flags live in refs: toggling them must not re-render the tape.
  const hoverRef = React.useRef(false);
  const tappedRef = React.useRef(false);

  // Measured copy width, mirrored into a ref for the rAF loop (state only
  // exists to re-render when the copy COUNT changes).
  const copyWRef = React.useRef(0);
  const [copies, setCopies] = React.useState(2);
  React.useEffect(() => {
    if (reduced) return;
    const copyEl = copyRef.current;
    const boxEl = containerRef.current;
    if (!copyEl || !boxEl) return;
    const measure = () => {
      const w = copyEl.getBoundingClientRect().width;
      const bw = boxEl.getBoundingClientRect().width;
      if (w > 0) {
        copyWRef.current = w;
        setCopies(Math.max(2, Math.ceil(bw / w) + 1));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(copyEl);
    ro.observe(boxEl);
    return () => ro.disconnect();
  }, [reduced]);

  // The crawl itself: one persistent rAF loop, one offset, one transform.
  React.useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let offset = 0;
    let lastTs: number | null = null;
    const step = (ts: number) => {
      const dt =
        lastTs == null ? 0 : Math.min((ts - lastTs) / 1000, MAX_FRAME_SEC);
      lastTs = ts;
      const w = copyWRef.current;
      if (w > 0 && !hoverRef.current && !tappedRef.current) {
        offset = (offset + PX_PER_SEC * dt) % w;
        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(${-offset}px, 0, 0)`;
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <Box
      ref={containerRef}
      onMouseEnter={reduced ? undefined : () => (hoverRef.current = true)}
      onMouseLeave={reduced ? undefined : () => (hoverRef.current = false)}
      onClick={
        reduced ? undefined : () => (tappedRef.current = !tappedRef.current)
      }
      sx={{
        width: '100%',
        minWidth: 0,
        overflowX: reduced ? 'auto' : 'hidden',
        WebkitOverflowScrolling: 'touch',
        // Fade both edges so a clipped segment reads as "more to come", not
        // cut off. Skipped in the static case (nothing is clipped mid-item).
        maskImage: reduced
          ? undefined
          : 'linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)',
      }}
    >
      {reduced ? (
        <Box sx={{ ...COPY_SX, whiteSpace: 'nowrap' }}>{items}</Box>
      ) : (
        <Box
          ref={trackRef}
          sx={{
            display: 'inline-flex',
            width: 'max-content',
            // Compositor hint: the transform updates every frame.
            willChange: 'transform',
          }}
        >
          {Array.from({ length: copies }, (_, i) => (
            <Box
              key={i}
              ref={i === 0 ? copyRef : undefined}
              aria-hidden={i > 0 || undefined}
              sx={COPY_SX}
            >
              {items}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default Ticker;
