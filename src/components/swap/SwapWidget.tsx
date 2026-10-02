import React from 'react';
import { Box } from '@mui/material';
import { useThemeMode } from '../../ThemeContext';
import {
  ACCESS_ORIGIN,
  SWAP_WIDGET_KEY,
  SWAP_WIDGET_URL,
} from './widgetConfig';

// Allways Access's embeddable swap box. It runs the swap itself on its own
// origin (the human check, the deposit address, the tracking), so this site
// only frames it: nothing to proxy or rebuild here. Which widget and key come
// from the build environment (widgetConfig).
// The height the widget is built to fit without scrolling; it takes any
// width from 380px up.
export const SWAP_WIDGET_HEIGHT = 560;
// Past this a reported height is not believed.
const MAX_HEIGHT = 1200;

// Loaded once, on the pair and theme it opens with. After that a new pair
// or theme is posted to it and it changes in place: no reload, no second
// app boot, so picking a cell or a watchlist row moves it at once.
const SwapWidget: React.FC<{ from: string; to: string }> = ({ from, to }) => {
  const { mode } = useThemeMode();
  const frame = React.useRef<HTMLIFrameElement>(null);
  const [src] = React.useState(
    () =>
      `${SWAP_WIDGET_URL}?${new URLSearchParams({
        key: SWAP_WIDGET_KEY,
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        theme: mode,
        // No card of its own: it sits on the ticket's surface.
        bg: 'transparent',
      })}`,
  );
  const post = React.useCallback(() => {
    frame.current?.contentWindow?.postMessage(
      {
        type: 'allways:widget',
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        theme: mode,
      },
      ACCESS_ORIGIN ?? '',
    );
  }, [from, to, mode]);
  React.useEffect(post, [post]);
  // The widget posts its content's height; the frame fits it, so a phone's
  // wrapped lines grow the box instead of scrolling inside it.
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
        setHeight(Math.min(MAX_HEIGHT, Math.max(SWAP_WIDGET_HEIGHT, h)));
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
