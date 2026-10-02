import React from 'react';
import { Box } from '@mui/material';
import { useThemeMode } from '../../ThemeContext';

// Allways Access's embeddable swap box. It runs the swap itself on its own
// origin (the human check, the deposit address, the tracking), so this site
// only frames it: no keys, no proxy, nothing to rebuild here.
// VITE_SWAP_WIDGET_URL points a local build at a local Access widget.
const WIDGET_URL =
  import.meta.env.VITE_SWAP_WIDGET_URL ||
  'https://allways.venturalabs.ai/widget';
const WIDGET_ORIGIN = new URL(WIDGET_URL).origin;
// Publishable: it names the account the widget swaps through, and is meant to
// sit in page source.
const WIDGET_KEY = 'alw_pub_ToUfdwlTXCnFDrF6p8PXZTJNscQ-Plz6my7VN0A1SBg';

// The height the widget is built to fit without scrolling; it takes any
// width from 380px up.
export const SWAP_WIDGET_HEIGHT = 560;

// Loaded once, on the pair and theme it opens with. After that a new pair
// or theme is posted to it and it changes in place: no reload, no second
// app boot, so picking a cell or a watchlist row moves it at once.
const SwapWidget: React.FC<{ from: string; to: string }> = ({ from, to }) => {
  const { mode } = useThemeMode();
  const frame = React.useRef<HTMLIFrameElement>(null);
  const [src] = React.useState(
    () =>
      `${WIDGET_URL}?${new URLSearchParams({
        key: WIDGET_KEY,
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        theme: mode,
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
      WIDGET_ORIGIN,
    );
  }, [from, to, mode]);
  React.useEffect(post, [post]);
  return (
    <Box
      component="iframe"
      ref={frame}
      src={src}
      // A change made while it was still loading lands once it can listen.
      onLoad={post}
      title="Swap"
      allow="clipboard-write"
      height={SWAP_WIDGET_HEIGHT}
      sx={{ border: 0, width: '100%', display: 'block' }}
    />
  );
};

export default SwapWidget;
