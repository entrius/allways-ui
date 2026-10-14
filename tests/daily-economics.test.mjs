import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const js = ts.transpileModule(readFileSync(new URL('../src/utils/dailyEconomics.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { dailyEconomics, economicsThroughNow, summarizeEconomics } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const now = Date.parse('2026-10-14T22:53:00Z');
const t = '2026-10-13T00:00:00Z';
test('complete UTC days exclude today, including DST-independent boundaries', () => {
  const rows = dailyEconomics([{t,feesUsd:100,unpricedSwaps:0},{t:'2026-10-14T00:00:00Z',feesUsd:9999,unpricedSwaps:0}], [{t,emissionsUsd:80}], 1, now);
  assert.deepEqual(rows, [{t:Date.parse(t),fees:100,emissions:80}]);
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
