import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const js = ts.transpileModule(readFileSync(new URL('../src/utils/dailyEconomics.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { dailyEconomics, economicsThroughNow, summarizeEconomics, solUsdForDay } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const now = Date.parse('2026-10-14T22:53:00Z');
const t = '2026-10-13T00:00:00Z';
test('complete UTC days exclude today, including DST-independent boundaries', () => {
  const rows = dailyEconomics([{t,feesUsd:100,unpricedSwaps:0},{t:'2026-10-14T00:00:00Z',feesUsd:9999,unpricedSwaps:0}], [{t,emissionsUsd:80}], 1, now);
  assert.deepEqual(rows, [{t:Date.parse(t),fees:100,swapFees:100,reservationFees:null,churnFees:null,emissions:80,burned:null}]);
  assert.equal(summarizeEconomics(rows).coverage,125);
  assert.equal(summarizeEconomics(rows).surplus,20);
});
test('missing and unpriced fee days must not manufacture coverage', () => {
  for (const fee of [{t,feesUsd:100,unpricedSwaps:1},{t,feesUsd:100},{t,feesUsd:null,unpricedSwaps:0}]) {
    const stats=summarizeEconomics(dailyEconomics([fee],[{t,emissionsUsd:80}],1,now));
    assert.equal(stats.coverage,null);assert.equal(stats.fees,null);assert.equal(stats.missingDays,1);
  }
});
test('zero fees are real; zero or missing emissions cannot produce infinite coverage', () => {
  assert.equal(summarizeEconomics(dailyEconomics([{t,feesUsd:0,unpricedSwaps:0}],[{t,emissionsUsd:80}],1,now)).coverage,0);
  for (const e of [0,null,NaN,-1]) assert.equal(summarizeEconomics(dailyEconomics([{t,feesUsd:100,unpricedSwaps:0}],[{t,emissionsUsd:e}],1,now)).coverage,null);
});
test('one missing day suppresses window totals; strings from precise JSON parse work', () => {
  const rows=dailyEconomics([{t,feesUsd:'3500',unpricedSwaps:0}],[{t,emissionsUsd:2800}],2,now);
  assert.equal(rows[1].fees,3500);assert.equal(summarizeEconomics(rows).coverage,null);
  assert.equal(summarizeEconomics(rows.slice(1)).coverage,125);
});

test('KPIs include today immediately and compare emissions for elapsed time only', () => {
  const today = '2026-10-14T00:00:00Z';
  const fees = [{t,feesUsd:100,unpricedSwaps:0},{t:today,feesUsd:200,unpricedSwaps:0}];
  const emissions = [{t,emissionsUsd:80},{t:today,emissionsUsd:160}];
  const rows = economicsThroughNow(fees,emissions,1,Date.parse('2026-10-14T12:00:00Z'));
  assert.equal(rows[1].fees,200);
  assert.equal(rows[1].emissions,80);
  const totals = summarizeEconomics(rows);
  assert.equal(totals.fees,300);
  assert.equal(totals.emissions,160);
  assert.equal(totals.coverage,187.5);
  assert.equal(totals.surplus,140);
  assert.equal(economicsThroughNow(fees,emissions,1,Date.parse(today))[1].emissions,0);
  assert.equal(economicsThroughNow(fees,[],1,Date.parse(today))[1].emissions,null);
  assert.equal(summarizeEconomics(economicsThroughNow([],emissions,1,now)).fees,null);
});

test('reservation and churn lamports join swap fees at that day\'s mean SOL price', () => {
  const day = Date.parse(t);
  const prices = [[day - 1, 999], [day, 100], [day + 86_400_000, 120], [day + 86_400_001, 999]];
  assert.equal(solUsdForDay(prices, day), 110);
  const treasury = [{t:day,reservationLamports:2e9,churnLamports:1e9}];
  const [row] = dailyEconomics([{t,feesUsd:100,unpricedSwaps:0}],[{t,emissionsUsd:800}],1,now,treasury,prices);
  assert.equal(row.reservationFees,220);
  assert.equal(row.churnFees,110);
  assert.equal(row.fees,430);
  assert.ok(Math.abs(summarizeEconomics([row]).coverage - 53.75) < 1e-9);
});
test('missing treasury income or SOL price leaves a gap instead of swap-only totals', () => {
  const day = Date.parse(t);
  const fee = [{t,feesUsd:100,unpricedSwaps:0}];
  const prices = [[day,100]];
  for (const [treasury, px] of [
    [[], prices],
    [[{t:day,reservationLamports:null,churnLamports:0}], prices],
    [[{t:day,reservationLamports:0,churnLamports:0}], []],
  ]) {
    const [row] = dailyEconomics(fee,[{t,emissionsUsd:80}],1,now,treasury,px);
    assert.equal(row.swapFees,100);
    assert.equal(row.fees,null);
  }
  const [zero] = dailyEconomics(fee,[{t,emissionsUsd:80}],1,now,[{t:day,reservationLamports:0,churnLamports:0}],prices);
  assert.equal(zero.fees,100);
});
test('today\'s treasury income counts in full; only emissions are prorated', () => {
  const today = Date.parse('2026-10-14T00:00:00Z');
  const rows = economicsThroughNow([{t:'2026-10-14T00:00:00Z',feesUsd:10,unpricedSwaps:0}],[{t:'2026-10-14T00:00:00Z',emissionsUsd:160}],0,Date.parse('2026-10-14T12:00:00Z'),[{t:today,reservationLamports:1e9,churnLamports:1e9}],[[today,100],[Date.parse('2026-10-14T11:59:00Z'),100]]);
  assert.equal(rows[0].fees,210);
  assert.equal(rows[0].emissions,80);
});
test('per-source totals sum their own column and go blank on any gap', () => {
  const day = Date.parse(t);
  const prev = day - 86_400_000;
  const prices = [[prev,100],[day,100],[day + 86_400_000,100]];
  const fee = [{t:new Date(prev).toISOString(),feesUsd:1,unpricedSwaps:0},{t,feesUsd:2,unpricedSwaps:0}];
  const full = summarizeEconomics(dailyEconomics(fee,[],2,now,[{t:prev,reservationLamports:1e9,churnLamports:0},{t:day,reservationLamports:2e9,churnLamports:1e9}],prices));
  assert.equal(full.swapFees,3);
  assert.equal(full.reservationFees,300);
  assert.equal(full.churnFees,100);
  const gap = summarizeEconomics(dailyEconomics(fee,[],2,now,[{t:day,reservationLamports:2e9,churnLamports:1e9}],prices));
  assert.equal(gap.reservationFees,null);
  assert.equal(gap.swapFees,3);
});
test('miner burn totals, burn rate, prorated today, and days fees beat emissions', () => {
  const day = '2026-10-13T00:00:00Z';
  const today = '2026-10-14T00:00:00Z';
  const rows = economicsThroughNow([{t:day,feesUsd:120,unpricedSwaps:0},{t:today,feesUsd:10,unpricedSwaps:0}],[{t:day,emissionsUsd:100,burnedUsd:25},{t:today,emissionsUsd:80,burnedUsd:20}],1,Date.parse('2026-10-14T12:00:00Z'));
  assert.equal(rows[1].burned,10);
  const s = summarizeEconomics(rows);
  assert.equal(s.burned,35);
  assert.equal(s.burnRate,20);
  assert.equal(s.coveredDays,1);
  assert.equal(s.comparableDays,2);
  assert.equal(summarizeEconomics(dailyEconomics([],[{t:day,emissionsUsd:100}],1,now)).burnRate,null);
});
test('a missing today row carries the latest sampled rate forward, prorated', () => {
  const today = '2026-10-14T00:00:00Z';
  const rows = economicsThroughNow([{t,feesUsd:1,unpricedSwaps:0},{t:today,feesUsd:1,unpricedSwaps:0}],[{t:'2026-10-12T00:00:00Z',emissionsUsd:999},{t,emissionsUsd:100,burnedUsd:10}],1,Date.parse('2026-10-14T06:00:00Z'));
  assert.equal(rows[1].emissions,25);
  assert.equal(rows[1].burned,2.5);
  assert.equal(economicsThroughNow([],[],1,now)[1].emissions,null);
});
