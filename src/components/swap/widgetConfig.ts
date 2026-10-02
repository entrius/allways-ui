// Which Allways Access swap widget the Markets desk frames, set per build
// environment (the deploy workflow writes them from the GitHub environment's
// variables). Both unset: no swap ticket at all, so a build only shows one
// where a widget and its key have been configured.
//   VITE_SWAP_WIDGET_URL  e.g. https://allways-testnet.venturalabs.ai/widget
//   VITE_SWAP_WIDGET_KEY  the widget's publishable key (alw_pub_...)
export const SWAP_WIDGET_URL = import.meta.env.VITE_SWAP_WIDGET_URL ?? '';
export const SWAP_WIDGET_KEY = import.meta.env.VITE_SWAP_WIDGET_KEY ?? '';

const origin = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

// The widget's own site: where its messages come from and "Open app" goes.
export const ACCESS_ORIGIN = origin(SWAP_WIDGET_URL);

export const swapWidgetEnabled = !!ACCESS_ORIGIN && !!SWAP_WIDGET_KEY;
