// CI prebuild: bake a fresh /chains snapshot into the image so the seed —
// the first-paint + das-outage floor — is never older than the last deploy.
// Any failure keeps the committed seed; this must never break a build.
import { readFileSync, writeFileSync } from "node:fs";

const DAS_URL = (process.env.DAS_URL || "https://api.all-ways.io").replace(/\/$/, "");
const SEED = "src/api/models/chains.seed.json";

try {
  const res = await fetch(`${DAS_URL}/chains`);
  if (!res.ok) throw new Error(`${DAS_URL}/chains -> ${res.status}`);
  const body = await res.json();
  if (!body.chains?.some((c) => c.hub)) throw new Error("payload has no hub");
  writeFileSync(SEED, JSON.stringify({ chains: body.chains }, null, 2) + "\n");
  console.log(`chains seed: refreshed from ${DAS_URL} (${body.chains.length} chains)`);
} catch (e) {
  const committed = JSON.parse(readFileSync(SEED, "utf8")).chains.length;
  console.warn(`chains seed: fetch failed (${e.message}) — keeping committed seed (${committed} chains)`);
}
