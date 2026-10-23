#!/usr/bin/env bash
# Upload .cloudflare/cloudflare-worker-meta-injector.js to the Worker that serves all-ways.io/*.
#
# Env (the GitHub Actions workflow deploy-worker.yml sets these from the repo's secrets and variables):
#   CLOUDFLARE_API_TOKEN   required. Account > Workers Scripts > Edit on the account that holds all-ways.io
#   CLOUDFLARE_ACCOUNT_ID  the account id (dashboard URL: dash.cloudflare.com/<account id>/...).
#                          Empty: looked up with GET /accounts (needs Account Settings > Read on the token).
#   CF_WORKER_NAME         the Worker's name in Workers & Pages.
#                          Empty: looked up from the zone's Workers route all-ways.io/* (needs Zone > Workers
#                          Routes > Read on the token, with all-ways.io in its zone resources).
#
# The existing Worker keeps its name, routes and compatibility settings; only the code changes.
# Usage: .cloudflare/deploy-meta-injector.sh [--dry-run]
set -euo pipefail

DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1

HERE=$(cd "$(dirname "$0")" && pwd)
SCRIPT="$HERE/cloudflare-worker-meta-injector.js"
ZONE=all-ways.io
API=https://api.cloudflare.com/client/v4
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || { echo "::error::CLOUDFLARE_API_TOKEN is not set" >&2; exit 1; }

cf() {  # cf <method> <path> [curl args...]  (the token only ever goes to api.cloudflare.com)
  local m="$1" p="$2"; shift 2
  curl -sS -X "$m" "$API$p" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$@"
}
field() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }
check() {  # check <file> <what>: fail with Cloudflare's errors when success is false
  python3 - "$1" "$2" <<'EOF'
import json, sys
d = json.load(open(sys.argv[1]))
if not d.get("success"):
    sys.exit(f"::error::{sys.argv[2]} failed: {d.get('errors')}")
EOF
}

node --check "$SCRIPT"
echo "script: ${SCRIPT#"$HERE"/} ($(wc -c < "$SCRIPT") bytes, $(git -C "$HERE" rev-parse --short HEAD 2>/dev/null || echo 'no git'))"

if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  cf GET "/accounts?per_page=50" > "$WORK/accounts.json"; check "$WORK/accounts.json" "listing accounts"
  N=$(field 'len(d["result"])' < "$WORK/accounts.json")
  [ "$N" = 1 ] || { echo "::error::the token sees $N accounts; set the CLOUDFLARE_ACCOUNT_ID variable:"; field '"\n".join(a["id"]+"  "+a["name"] for a in d["result"])' < "$WORK/accounts.json"; exit 1; }
  CLOUDFLARE_ACCOUNT_ID=$(field 'd["result"][0]["id"]' < "$WORK/accounts.json")
fi

if [ -z "${CF_WORKER_NAME:-}" ]; then
  cf GET "/zones?name=$ZONE" > "$WORK/zones.json"; check "$WORK/zones.json" "finding zone $ZONE"
  ZONE_ID=$(field 'd["result"][0]["id"]' < "$WORK/zones.json")
  cf GET "/zones/$ZONE_ID/workers/routes" > "$WORK/routes.json"; check "$WORK/routes.json" "listing Workers routes"
  CF_WORKER_NAME=$(python3 - "$WORK/routes.json" "$ZONE" <<'EOF'
import json, sys
routes = json.load(open(sys.argv[1]))["result"]
zone = sys.argv[2]
names = sorted({r["script"] for r in routes if r.get("script") and f"{zone}/" in r["pattern"] and not r["pattern"].startswith("test")})
if len(names) != 1:
    sys.exit(f"::error::expected one Worker on {zone}/* routes, found {names or 'none'}; set the CF_WORKER_NAME variable. Routes: {routes}")
print(names[0])
EOF
  )
fi
echo "worker: $CF_WORKER_NAME (account ${CLOUDFLARE_ACCOUNT_ID:0:6}...)"

# Keep the Worker's compatibility settings. A Worker with bindings is not what this script expects.
cf GET "/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$CF_WORKER_NAME/settings" > "$WORK/settings.json"
check "$WORK/settings.json" "reading settings of Worker $CF_WORKER_NAME"
python3 - "$WORK" <<'EOF'
import json, sys
w = sys.argv[1]
s = json.load(open(f"{w}/settings.json"))["result"]
if s.get("bindings"):
    sys.exit(f"::error::the Worker has bindings {s['bindings']}; this script only redeploys a plain Worker")
meta = {"body_part": "script"}  # service-worker syntax: the file uses addEventListener("fetch")
for k in ("compatibility_date", "compatibility_flags"):
    if s.get(k):
        meta[k] = s[k]
json.dump(meta, open(f"{w}/metadata.json", "w"))
print("settings:", meta)
EOF

if [ "$DRY" = 1 ]; then echo "dry run: not uploading"; exit 0; fi

cf PUT "/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$CF_WORKER_NAME" \
  -F "metadata=@$WORK/metadata.json;type=application/json" \
  -F "script=@$SCRIPT;type=application/javascript" > "$WORK/upload.json"
check "$WORK/upload.json" "uploading Worker $CF_WORKER_NAME"
echo "deployed: $CF_WORKER_NAME"

# Live check: prerendered pages keep their own <title> with the new Worker.
sleep 5
for p in / /market /network /agents; do
  printf "  %-9s %s\n" "$p" "$(curl -s -A 'Mozilla/5.0 (compatible; GPTBot/1.1)' "https://$ZONE$p" | grep -oE '<title>[^<]*' | head -1)"
done
