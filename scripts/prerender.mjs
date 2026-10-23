// Build-time static prerender for crawlers and AI answer engines.
//
// Runs after `vite build` (see the `build` script). For each public,
// indexable route it writes a copy of dist/index.html with a route-specific
// <title>, description, canonical link, JSON-LD, and real semantic HTML
// inside <div id="root">, then writes dist/sitemap.xml.
//
// The app mounts with createRoot (not hydrate), so React simply replaces the
// static markup on mount. The markup is kept invisible for the first moment
// of page load so JavaScript users never see it flash; without JavaScript it
// fades in after a short delay. Crawlers read it straight from the HTML.
//
// Output paths match what `vite preview` serves: /market -> dist/market.html.
// dist/index.html becomes the prerendered home page, so the untouched SPA
// shell is kept as dist/spa-shell.html and the preview middleware in
// vite.config.ts serves it for every other client-side route (/swap/:id,
// /miners/:hotkey, /app, ...), so they never inherit the home page's text.
//
// Copy comes from the page components (src/components/landing/*,
// src/pages/*). Keep it in sync when that copy changes.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const SITE = 'https://all-ways.io';
const SHELL_FILE = 'spa-shell.html';

// Canonical entity description. Keep identical in index.html, the landing
// page SEO, the Cloudflare worker default, and the llms.txt opening.
const SHORT =
  'Allways (Bittensor Subnet 7) is a marketplace for native asset transactions: any asset to any asset, at posted exchange rates, backed by locked funds worth the full value.';
const LONG =
  'Allways is Bittensor Subnet 7 (SN7), a marketplace for moving value between native assets. Pick any two supported assets, see the exchange rate up front, and receive the native asset in the wallet you choose. Every transaction is backed by locked funds worth its full value, and independent checks confirm delivery on both chains. Assets stay native: nothing is wrapped and no one holds your funds in between.';

const LINKS = {
  docs: 'https://docs.all-ways.io',
  github: 'https://github.com/entrius/allways',
  x: 'https://x.com/allways_io',
  discord: 'https://discord.gg/Q99Z2UQt9J',
  terms: 'https://docs.all-ways.io/terms',
  privacy: 'https://docs.all-ways.io/privacy',
  api: 'https://api.all-ways.io/swagger',
};

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Supported assets from the committed chains seed (the live set is GET
// /chains). Subnet alpha entries are left out of the marketing list.
const seed = JSON.parse(
  readFileSync(resolve(ROOT, 'src/api/models/chains.seed.json'), 'utf8'),
);
const assets = seed.chains
  .filter((c) => !/^sn\d+$/.test(c.id))
  .map((c) =>
    c.name.startsWith(c.symbol) ? c.name : `${c.name} (${c.symbol})`,
  );
const assetSentence = `Supported assets include ${assets
  .slice(0, -1)
  .join(', ')}, and ${assets[assets.length - 1]}.`;

const link = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;

const header = `<header>
<p><a href="/">Allways</a> (Bittensor Subnet 7)</p>
<nav aria-label="Main"><ul>
<li>${link('/market', 'Markets')}</li>
<li>${link('/network', 'Network')}</li>
<li>${link('/agents', 'Agents')}</li>
<li>${link(LINKS.docs, 'Docs')}</li>
</ul></nav>
</header>`;

const footer = `<footer>
<p>${esc(SHORT)}</p>
<ul>
<li>${link(LINKS.docs, 'Documentation')}</li>
<li>${link('/llms.txt', 'Agent quickstart (llms.txt)')}</li>
<li>${link(LINKS.api, 'Public API')}</li>
<li>${link(LINKS.github, 'Source code on GitHub')}</li>
<li>${link(LINKS.x, 'Allways on X')}</li>
<li>${link(LINKS.discord, 'Discord')}</li>
<li>${link(LINKS.terms, 'Terms')}</li>
<li>${link(LINKS.privacy, 'Privacy')}</li>
</ul>
</footer>`;

const cards = (items) =>
  items
    .map(
      ([title, body]) =>
        `<article><h3>${esc(title)}</h3><p>${esc(body)}</p></article>`,
    )
    .join('\n');

// Mirrors src/components/landing/{Hero,HowItWorks,ValueProps,AgentTeaser}.
const homeBody = `<section>
<p>Bittensor · Subnet 7</p>
<h1>Allways: any asset to any asset.</h1>
<p>${esc(LONG)}</p>
<p>A direct, liquid market between any two assets. Choose what you send, what arrives, and where it lands.</p>
<p>${link('/market', 'Open the markets')} · ${link('/agents', 'For agents')}</p>
</section>
<section>
<h2>How a transaction works: four steps, delivery guaranteed</h2>
<ol>
<li><h3>Every pair is a market</h3><p>BTC to TAO, SOL to BTC, and so on. Rates are posted up front, and every rate is backed by locked funds worth the full value of your transaction.</p></li>
<li><h3>See the exact amount</h3><p>You know what will be delivered before you commit. Then you send from your own wallet.</p></li>
<li><h3>It lands where you say</h3><p>The real asset arrives at the destination you chose: your wallet, or the person you're paying.</p></li>
<li><h3>Both sides get verified</h3><p>Independent checkers confirm you sent and that delivery landed. If it does not arrive as promised, the locked funds repay you in full, automatically.</p></li>
</ol>
</section>
<section>
<h2>Why Allways: built for the next million transactions</h2>
${cards([
  [
    'Guaranteed',
    'Every transaction is backed by locked funds worth its full value. If delivery fails, you are repaid in full, automatically.',
  ],
  [
    'Best rate',
    'Nodes compete for every transaction, so posted rates keep improving. The rate you take is the best available.',
  ],
  [
    'The real asset',
    'Real BTC, real SOL, real TAO. What arrives settles natively on its own chain.',
  ],
  [
    'Open + agentic',
    'The code is open source, every feed is public. One copy-paste teaches an AI agent to quote, transact, and watch.',
  ],
])}
</section>
<section>
<h2>Supported assets</h2>
<p>${esc(assetSentence)} The live list is on the ${link('/market', 'markets page')}.</p>
</section>
<section>
<h2>For AI agents: one click to teach an agent Allways</h2>
<p>Copy a single markdown bundle of context, CLI, and API. Paste it into any agent harness and it can quote, exchange, and watch live state. Read it at ${link('/llms.txt', 'all-ways.io/llms.txt')} or on the ${link('/agents', 'agents page')}.</p>
</section>`;

// Mirrors src/pages/MarketPage.tsx (its widgets) and the landing copy.
const marketBody = `<section>
<p>Allways · Bittensor Subnet 7</p>
<h1>Markets</h1>
<p>Live exchange rates for every pair on Allways (Bittensor Subnet 7). Every pair is a market, each direction is priced on its own, and every rate is backed by locked funds worth the full value of your transaction.</p>
<p>${esc(assetSentence)}</p>
</section>
<section>
<h2>What the markets page shows</h2>
${cards([
  [
    'Matrix',
    'A grid of posted rates: each row is an asset, each column an asset you can exchange it for, with a rate for each direction.',
  ],
  [
    'Rate',
    'The selected rate as a headline, what it means in a sentence, and the high, low and spread over the chosen window.',
  ],
  ['History', 'How the selected rate has moved over time.'],
  [
    'Order book',
    'Every posted rate for the selected direction, grouped into price levels the way an exchange shows depth.',
  ],
  [
    'Watchlist',
    'One row per direction with its last rate, volume and move over the chosen window.',
  ],
])}
</section>
<section>
<h2>Related</h2>
<p>See every transaction, miner and network stat on the ${link('/network', 'network page')}, or teach an AI agent to quote and transact on the ${link('/agents', 'agents page')}.</p>
</section>`;

// Mirrors src/pages/NetworkPage.tsx.
const networkBody = `<section>
<p>Allways · Bittensor Subnet 7</p>
<h1>Network</h1>
<p>Transactions, miners and network stats for Allways (Bittensor Subnet 7), live from the public API.</p>
</section>
<section>
<h2>Transactions</h2>
<p>The live transaction tape: every transaction on Allways, its pair, amounts and status, newest first.</p>
</section>
<section>
<h2>Miners</h2>
<p>Who is serving the network: crown share, success rate, collateral and volume per node.</p>
</section>
<section>
<h2>Network Stats</h2>
<p>What the protocol earns, how much it trades and who uses it, over 7D, 30D or all time, each against the period before.</p>
</section>`;

// Mirrors src/pages/AgentsPage.tsx and src/components/agents/*.
const agentsBody = `<section>
<p>For AI Agents</p>
<h1>Allways for agents.</h1>
<p>Everything an LLM needs to quote rates, swap, and watch live state on Allways (Bittensor Subnet 7). Hand it to your agent so it can swap natively between digital assets on its own.</p>
</section>
<section>
<h2>1 · Hand off context: copy once, ingest once</h2>
<p>Hand this to an agent and it can use Allways. The full bundle is published at ${link('/llms.txt', 'all-ways.io/llms.txt')}.</p>
</section>
<section>
<h2>2 · Bootstrap with live state</h2>
<p>Download a JSON of the network right now. Stats, miners, active swaps, and recent events in one file. Skip four API calls in an agent's bootstrap.</p>
</section>
<section>
<h2>3 · Quote against the orderbook</h2>
<p>Quote against the live orderbook. Picks the best active miner. Copy the CLI line and run it from any agent shell.</p>
</section>
<section>
<h2>4 · Deeper integrations</h2>
${cards([
  [
    'Live SSE stream',
    'Subscribe to /sse for push updates on miners, swaps, and contract events. Avoids polling entirely.',
  ],
  [
    'OpenAPI spec',
    'Live Swagger UI for every endpoint, plus a machine-readable schema you can point any OpenAPI codegen at to scaffold a typed client.',
  ],
  [
    'Source repos',
    'The contract, neurons, CLI, and this UI are all open source. Read the implementation if you want ground truth.',
  ],
])}
<p>${link(LINKS.api, 'Open Swagger')} · ${link(LINKS.github, 'github.com/entrius/allways')}</p>
</section>`;

const ROUTES = [
  {
    path: '/',
    file: 'index.html',
    title: 'Allways (Bittensor Subnet 7): any asset to any asset',
    ogTitle: 'Allways',
    description: SHORT,
    body: homeBody,
    priority: '1.0',
  },
  {
    path: '/market',
    file: 'market.html',
    title: 'Markets | Allways',
    description:
      'Live exchange rates for every pair on Allways, Bittensor Subnet 7.',
    body: marketBody,
    priority: '0.9',
  },
  {
    path: '/network',
    file: 'network.html',
    title: 'Network | Allways',
    description:
      'Transactions, miners and network stats for Allways, Bittensor Subnet 7.',
    body: networkBody,
    priority: '0.8',
  },
  {
    path: '/agents',
    file: 'agents.html',
    title: 'Agents | Allways',
    description:
      'Drop-in context bundle, live snapshot, and rate quotes for AI agents using Allways, Bittensor Subnet 7.',
    body: agentsBody,
    priority: '0.8',
  },
];

const replaceMeta = (html, attr, key, value) => {
  const re = new RegExp(`<meta ${attr}="${key}"[\\s\\S]*?/>`, 'i');
  if (!re.test(html)) throw new Error(`prerender: no <meta ${attr}="${key}">`);
  return html.replace(re, `<meta ${attr}="${key}" content="${esc(value)}" />`);
};

// Hidden for the first moment so JavaScript users never see it before React
// replaces it; shown after a delay for anyone without JavaScript.
const STYLE = `<style>#root>.prerender{max-width:760px;margin:0 auto;padding:32px 16px;font-family:Inter,system-ui,sans-serif;line-height:1.55;opacity:0;animation:prerender-in .2s ease 1.5s forwards}@keyframes prerender-in{to{opacity:1}}</style>`;

const render = (shell, route) => {
  const url = `${SITE}${route.path === '/' ? '/' : route.path}`;
  const ogTitle = route.ogTitle ?? route.title;
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: route.title,
    description: route.description,
    inLanguage: 'en',
    isPartOf: { '@id': `${SITE}/#website` },
    about: { '@id': `${SITE}/#app` },
  };
  let html = shell
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(route.title)}</title>`)
    .replace(
      '</head>',
      `  <link rel="canonical" href="${url}" data-rh="true" />\n` +
        `  <script type="application/ld+json">${JSON.stringify(webPage)}</script>\n` +
        `  ${STYLE}\n</head>`,
    )
    .replace(
      /<div id="root"><\/div>/,
      `<div id="root" data-prerendered="true"><div class="prerender">\n${header}\n<main>\n${route.body}\n</main>\n${footer}\n</div></div>`,
    );
  html = replaceMeta(html, 'name', 'title', route.title);
  html = replaceMeta(html, 'name', 'description', route.description);
  html = replaceMeta(html, 'property', 'og:url', url);
  html = replaceMeta(html, 'property', 'og:title', ogTitle);
  html = replaceMeta(html, 'property', 'og:description', route.description);
  html = replaceMeta(html, 'name', 'twitter:title', ogTitle);
  html = replaceMeta(html, 'name', 'twitter:description', route.description);
  if (!html.includes('data-prerendered')) {
    throw new Error(`prerender: could not inject ${route.path}`);
  }
  return html;
};

const main = () => {
  const indexPath = resolve(DIST, 'index.html');
  const shellPath = resolve(DIST, SHELL_FILE);
  // Re-running without a fresh build: start from the saved shell.
  const current = readFileSync(indexPath, 'utf8');
  const shell = current.includes('data-prerendered')
    ? readFileSync(shellPath, 'utf8')
    : current;
  if (!existsSync(shellPath) || !current.includes('data-prerendered')) {
    writeFileSync(shellPath, shell);
  }

  for (const route of ROUTES) {
    writeFileSync(resolve(DIST, route.file), render(shell, route));
  }

  const today = new Date().toISOString().slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map(
  (r) =>
    `  <url>\n    <loc>${SITE}${r.path}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${r.priority}</priority>\n  </url>`,
).join('\n')}
</urlset>
`;
  writeFileSync(resolve(DIST, 'sitemap.xml'), sitemap);
  console.log(
    `prerender: wrote ${ROUTES.map((r) => r.file).join(', ')}, ${SHELL_FILE}, sitemap.xml`,
  );
};

main();
