"""Read-only Finney daily estimates. Requires the current bittensor Client SDK.
python scripts/collect-miner-emissions.py [days] [previous.json] > public/local-data/miner-emissions.json
(previous.json: reuse its complete past days and only sample the rest)
(days defaults to 30; the network went live 2026-07-11, so ~100 covers ALL)
Samples UTC days at 00/06/12/18 UTC. Today uses available samples only;
its full-day projection is not included in complete-day totals. Not a payout indexer.
"""
import asyncio
import json
import sys
import urllib.request
from datetime import datetime, timezone
import bittensor as bt
from bittensor._generated import runtime_apis, storage

DAY = 86400
DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 30
PREVIOUS = {}
if len(sys.argv) > 2:
    with open(sys.argv[2]) as f:
        PREVIOUS = {r['t']: r for r in json.load(f)['rows'] if r.get('emissionsUsd') is not None}

def tao_prices(days):
    # CoinGecko returns hourly points only for windows up to 90 days, so a
    # longer history is fetched in <=85-day slices.
    import time
    end = int(time.time())
    start = end - (days + 1) * DAY
    prices = []
    while start < end:
        stop = min(start + 85 * DAY, end)
        url = f'https://api.coingecko.com/api/v3/coins/bittensor/market_chart/range?vs_currency=usd&from={start}&to={stop}'
        with urllib.request.urlopen(url, timeout=30) as r:
            prices += json.load(r)['prices']
        start = stop
    return prices

async def collect():
    prices = tao_prices(DAYS)
    async with bt.Client('finney') as client:
        head = await client.at()
        now = (await head.timestamp()).timestamp()
        graph = await head.runtime(runtime_apis.SubnetInfoRuntimeApi.get_metagraph, [7])
        block = graph['block']
        today = int(now // DAY) * DAY
        # The public archive caps historical lookups, so stay at two at a time
        # and back off when it says so.
        sem = asyncio.Semaphore(2)
        async def sample(target):
            for attempt in range(6):
                try:
                    return await sample_once(target)
                except Exception as e:
                    if 'rate limit' not in str(e).lower() or attempt == 5:
                        raise
                    await asyncio.sleep(20 * (attempt + 1))
        async def sample_once(target):
            async with sem:
                # Locate the target timestamp, including days with missed slots.
                b = block - round((now - target) / 12)
                for _ in range(4):
                    h = await client.at(b)
                    ts = (await h.timestamp()).timestamp()
                    if abs(ts-target) <= 24:
                        break
                    b += round((target-ts)/12)
                if abs(ts-target) > 60:
                    raise ValueError('Historical block timestamp does not match sampling window')
                g, burn, cut, enabled = await asyncio.gather(
                    h.runtime(runtime_apis.SubnetInfoRuntimeApi.get_metagraph, [7]),
                    h.query(storage.SubtensorModule.MinerBurned, [7]),
                    h.query(storage.SubtensorModule.SubnetOwnerCut, []),
                    h.query(storage.SubtensorModule.OwnerCutEnabled, [7]),
                )
                price_t, usd = min(prices, key=lambda p: abs(p[0]/1000-ts))
                if abs(price_t/1000-ts) > 7200:
                    raise ValueError('TAO/USD observation more than two hours from sample')
                withheld = burn['bits']/2**32
                if g['alpha_out_emission'] == 0:
                    # Nothing emitted to the subnet yet: a real zero, not a gap.
                    return {'block':b, 't':datetime.fromtimestamp(ts,timezone.utc).isoformat(), 'dailyUsd':0.0, 'burnFraction':withheld,'taoUsd':usd}
                if g['alpha_in'] == 0:
                    raise ValueError('Subnet pool has no alpha reserve at this block')
                alpha_day = (g['alpha_out_emission']/1e9)*7200*(1-cut/65535 if enabled else 1)*.5*(1-withheld)
                usd_day = alpha_day * (g['tao_in']/g['alpha_in']) * usd
                return {'block':b, 't':datetime.fromtimestamp(ts,timezone.utc).isoformat(), 'dailyUsd':usd_day, 'burnFraction':withheld,'taoUsd':usd}
        async def day(start):
            key = datetime.fromtimestamp(start,timezone.utc).isoformat()
            if key in PREVIOUS and start + DAY <= now:
                print(key, 'reused', file=sys.stderr, flush=True)
                return PREVIOUS[key]
            try:
                samples = await asyncio.gather(*(sample(start+hour*3600) for hour in [0,6,12,18] if start+hour*3600 <= now))
                result={'t':datetime.fromtimestamp(start,timezone.utc).isoformat(),'emissionsUsd':sum(s['dailyUsd'] for s in samples)/len(samples),'burnedUsd':sum(s['dailyUsd']*s['burnFraction']/(1-s['burnFraction']) for s in samples)/len(samples),'samples':samples}
            except Exception as e:
                result={'t':datetime.fromtimestamp(start,timezone.utc).isoformat(),'emissionsUsd':None,'error':str(e)}
            print(result['t'], result['emissionsUsd'], file=sys.stderr,flush=True)
            return result
        rows = await asyncio.gather(*(day(today-i*DAY) for i in range(DAYS,-1,-1)))
        return {'netuid':7,'network':'finney','asOf':datetime.fromtimestamp(now,timezone.utc).isoformat(),'method':'Four historical rate samples per UTC day, after burn (burnedUsd is the MinerBurned share withheld), with contemporaneous TAO/USD; assumes 12-second blocks. Estimates, not indexed payouts.','rows':rows}
print(json.dumps(asyncio.run(collect())))
