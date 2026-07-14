/**
 * Cloudflare Worker - Dynamic Meta Tag Injector for Allways
 *
 * Deployed on the all-ways.io zone in front of the SPA. Crawlers don't run
 * JS, so this rewrites <head> meta tags per route and points og:image at
 * the API's dynamic card renderer (das-allways GET /og-image).
 *
 * Same architecture as gittensor-ui's meta injector; adapted for Allways'
 * path-param routes (/swap/:swapId) instead of query-param routes.
 */

// Point both at the matching environment when deploying to the test zone
// (test.all-ways.io -> https://test-api.all-ways.io).
const API_BASE = "https://api.all-ways.io";
const SITE_BASE = "https://all-ways.io";

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // Only process HTML requests
  const accept = request.headers.get("Accept") || "";
  const isHtmlRequest =
    accept.includes("text/html") ||
    url.pathname === "/" ||
    !url.pathname.includes(".");

  // Fetch the original response
  const response = await fetch(request);

  // Only modify HTML responses
  if (
    !isHtmlRequest ||
    !response.headers.get("content-type")?.includes("text/html")
  ) {
    return response;
  }

  const html = await response.text();
  const modifiedHtml = await injectMetaTags(html, url);

  return new Response(modifiedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

// Mirror of allways-ui/src/utils/format.ts CHAIN_DECIMALS — keep in lockstep.
const CHAIN_DECIMALS = {
  btc: { exp: 1e8, digits: 8, symbol: "BTC" },
  tao: { exp: 1e9, digits: 4, symbol: "TAO" },
  sol: { exp: 1e9, digits: 4, symbol: "SOL" },
};

function formatAmount(raw, chain) {
  const config = CHAIN_DECIMALS[(chain || "").toLowerCase()];
  const val = parseInt(raw, 10);
  if (!config || !Number.isFinite(val)) return null;
  const fixed = (val / config.exp).toFixed(config.digits);
  const trimmed = fixed.replace(/(\.\d\d[0-9]*?)0+$/, "$1").replace(/\.$/, "");
  return `${trimmed} ${config.symbol}`;
}

const STATUS_LABELS = {
  ACTIVE: "Active",
  FULFILLED: "Fulfilled",
  COMPLETED: "Completed",
  TIMED_OUT: "Timed out",
};

// Mirror of das-allways og-images formatDurationSecs — full words.
function formatDuration(secs) {
  if (!Number.isFinite(secs) || secs < 0) return null;
  const unit = (value, name) => `${value} ${name}${value === 1 ? "" : "s"}`;
  if (secs < 60) return unit(Math.round(secs), "second");
  if (secs < 3600) return unit(Math.round(secs / 60), "minute");
  const hours = parseFloat((secs / 3600).toFixed(1));
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Inject dynamic meta tags based on URL
 */
async function injectMetaTags(html, url) {
  const pathname = url.pathname;

  // Fresh render per share while platform caches still apply per-URL.
  const cacheBuster = Date.now();

  // Just the name: the og image itself says "Any asset to any asset."
  let title = "Allways";
  let description =
    "Choose what you send, what arrives, and where it lands. Delivery guaranteed. Bittensor Subnet 7.";
  let image = `${API_BASE}/og-image?type=home&v=${cacheBuster}`;
  let imageAlt =
    "Allways — any asset to any asset. Universal transaction layer on Bittensor Subnet 7.";

  // Swap detail page: /swap/:swapId
  const swapMatch = pathname.match(/^\/swap\/(-?\d+)$/);
  if (swapMatch) {
    const swapId = swapMatch[1];
    image = `${API_BASE}/og-image?type=swap&id=${encodeURIComponent(swapId)}&v=${cacheBuster}`;
    title = "Swap on Allways";
    description =
      "Track this swap on Allways, the universal transaction layer on Bittensor Subnet 7.";
    imageAlt = "Swap details on Allways.";

    // Enrich title/description from the API so text matches the card.
    // Any failure keeps the generic swap copy — never block the page.
    try {
      const apiResponse = await fetch(
        `${API_BASE}/swaps/${encodeURIComponent(swapId)}`,
      );
      if (apiResponse.ok) {
        const { swap } = await apiResponse.json();
        if (swap) {
          const source = formatAmount(swap.sourceAmount, swap.sourceChain);
          const dest = formatAmount(
            swap.deliveredAmount ?? swap.destAmount,
            swap.destChain,
          );
          let status = STATUS_LABELS[swap.status] || swap.status;
          // "Completed in 27 seconds" — same speed flex as the card
          const duration = formatDuration(
            parseInt(swap.completedAt, 10) - parseInt(swap.initiatedAt, 10),
          );
          if (swap.status === "COMPLETED" && duration) {
            status = `Completed in ${duration}`;
          }
          const seq = swap.seq != null ? `Transaction #${swap.seq}` : "Swap";
          if (source && dest) {
            // Plain "to", not "→": title text renders in the platform's own
            // font, and U+2192 tofu-boxes on some of them. No brand suffix —
            // og:site_name and the domain line already carry it.
            title = `${source} to ${dest}`;
            // Positive claim only (no "no bridges/IOUs" negations) — state
            // what it is: the native asset, on the destination chain
            description = `${seq} · ${status}. The native asset, settled on the destination chain. Delivery guaranteed on Allways, Bittensor Subnet 7.`;
            imageAlt = `${seq} on Allways: ${source} to ${dest}, ${status.toLowerCase()}.`;
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch swap for meta tags:", error);
    }
  }

  // Note: home page and all other paths use the default brand card set above

  const canonicalUrl = `${SITE_BASE}${pathname}`;

  // Replace meta tags - use [\s\S]*? to match across newlines (the source
  // index.html wraps long content attributes onto their own line).
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta name="title"[\s\S]*?\/>/i,
      `<meta name="title" content="${escapeHtml(title)}" />`,
    )
    .replace(
      /<meta name="description"[\s\S]*?\/>/i,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    )
    .replace(
      /<meta property="og:url"[\s\S]*?\/>/i,
      `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    )
    .replace(
      /<meta property="og:title"[\s\S]*?\/>/i,
      `<meta property="og:title" content="${escapeHtml(title)}" />`,
    )
    .replace(
      /<meta property="og:description"[\s\S]*?\/>/i,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
    )
    .replace(
      /<meta property="og:image"[\s\S]*?\/>/i,
      `<meta property="og:image" content="${escapeHtml(image)}" />`,
    )
    .replace(
      /<meta property="og:image:alt"[\s\S]*?\/>/i,
      `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
    )
    .replace(
      /<meta (property|name)="twitter:title"[\s\S]*?\/>/i,
      `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    )
    .replace(
      /<meta (property|name)="twitter:description"[\s\S]*?\/>/i,
      `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    )
    .replace(
      /<meta (property|name)="twitter:image"[\s\S]*?\/>/i,
      `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    )
    .replace(
      /<meta (property|name)="twitter:image:alt"[\s\S]*?\/>/i,
      `<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`,
    );
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
