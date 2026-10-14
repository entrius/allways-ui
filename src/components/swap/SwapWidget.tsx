import React from 'react';
import { Box } from '@mui/material';
import {
  ACCESS_ORIGIN,
  SWAP_WIDGET_KEY,
  SWAP_WIDGET_URL,
} from './widgetConfig';

// Allways Access's embeddable swap box. It runs the swap itself on its own
// origin (the human check, the deposit address, the tracking), so this site
// only frames it: nothing to proxy or rebuild here. Which widget and key come
// from the build environment (widgetConfig).
// The frame's height until the widget reports its own; it takes any width
// from 380px up.
export const SWAP_WIDGET_HEIGHT = 560;
// Outside these a reported height is not believed.
const MIN_HEIGHT = 300;
const MAX_HEIGHT = 1200;

export type SwapPick = { from: string; to: string } | null;

// Loaded on the key alone, so it opens on the pair and theme its owner saved
// in Allways Access. Only a pair the visitor picks is posted to it: it
// changes in place, no reload.
const SwapWidget: React.FC<{ pick: SwapPick }> = ({ pick }) => {
  const frame = React.useRef<HTMLIFrameElement>(null);
  const [src] = React.useState(
    () =>
      `${SWAP_WIDGET_URL}?${new URLSearchParams({
        key: SWAP_WIDGET_KEY,
        // No card of its own: it sits on the ticket's surface.
        bg: 'transparent',
      })}`,
  );
  const from = pick?.from.toLowerCase();
  const to = pick?.to.toLowerCase();
  const post = React.useCallback(() => {
    if (!from || !to) return;
    frame.current?.contentWindow?.postMessage(
      { type: 'allways:widget', from, to },
      ACCESS_ORIGIN ?? '',
    );
  }, [from, to]);
  React.useEffect(post, [post]);
  // The widget posts its content's height; the frame fits it, so the box ends
  // where the form does and a phone's wrapped lines grow it, never scroll.
  const [height, setHeight] = React.useState(SWAP_WIDGET_HEIGHT);
  React.useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        e.origin !== ACCESS_ORIGIN ||
        e.source !== frame.current?.contentWindow ||
        e.data?.type !== 'allways:widget-size'
      )
        return;
      const h = Number(e.data.height);
      if (Number.isFinite(h))
        setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, h)));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  return (
    <Box
      component="iframe"
      ref={frame}
      src={src}
      // A change made while it was still loading lands once it can listen.
      onLoad={post}
      title="Swap"
      allow="clipboard-write"
      height={height}
      sx={{ border: 0, width: '100%', display: 'block' }}
    />
  );
};

export default SwapWidget;
