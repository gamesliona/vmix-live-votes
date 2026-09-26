import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { parseVotes } from './sheets.mjs';
const script = await readFile(new URL('./overlay.js', import.meta.url), 'utf8');
const config = {countCells:['B2','B3'], labelCells:['A2','A3']};
function data(a,b) { return {values:[['TEAM','Votes','Percentage'],['supernOva',a,0],['grumblebee',b,0]]}; }
test('shares use the two counts, including a zero total; malformed values are rejected', () => {
  assert.deepEqual(parseVotes(data(2,2), config).map(t=>t.percentage), [50,50]);
  assert.deepEqual(parseVotes(data(2,1), config).map(t=>t.percentage.toFixed(1)), ['66.7','33.3']);
  assert.deepEqual(parseVotes(data(0,0), config).map(t=>t.percentage), [0,0]);
  for (const bad of [null,'2',-1,NaN]) assert.throws(()=>parseVotes(data(bad,2),config));
});
test('display updates in place every 7s and preserves the last values on HTTP failure', async () => {
  const elements = new Map();
  const document = { getElementById(id) {
    if (!elements.has(id)) elements.set(id, {textContent:'',firstElementChild:{style:{}},setAttribute(k,v){this[k]=v;}});
    return elements.get(id);
  }};
  let tick, index = 0;
  const results = [data(2,2),data(2,1),data(0,0),data(2,1),null,data(1,2),data(2,2)];
  vm.runInNewContext(script, {
    document, location:{search:''}, URLSearchParams, AbortController, setTimeout, clearTimeout, console:{warn(){}},
    setInterval(fn, ms){assert.equal(ms,7000);tick=fn;},
    fetch: async()=> { const value=results[index++]; return {ok:!!value,json:async()=>value ? {teams:parseVotes(value,config),updatedAt:'test'} : {error:'HTTP 503'}}; }
  });
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(elements.get('percentage-0').textContent,'50.0');
  assert.equal(elements.get('bar-0')['data-losing'],'false');
  assert.equal(elements.get('bar-1')['data-losing'],'false');
  assert.equal(elements.get('divider').style, 'left:50%');
  await tick();
  assert.equal(elements.get('percentage-0').textContent,'66.7');
  assert.equal(elements.get('percentage-1').textContent,'33.3');
  assert.equal(elements.get('count-0').textContent,'2 votes');
  assert.equal(elements.get('count-1').textContent,'1 vote');
  assert.equal(elements.get('bar-1')['data-losing'],'true');
  assert.ok(Math.abs(parseFloat(elements.get('bar-0').firstElementChild.style.width)-200/3)<1e-10);
  await tick();
  assert.equal(elements.get('percentage-0').textContent,'0.0');
  assert.equal(elements.get('bar-1').firstElementChild.style.width,'0%');
  assert.equal(elements.get('split-track')['data-empty'], 'true');
  await tick();
  const width = elements.get('bar-0').firstElementChild.style.width;
  await tick();
  assert.equal(elements.get('bar-0').firstElementChild.style.width,width);
  assert.equal(elements.get('divider').style, `left:${2/3*100}%`);
  assert.equal(elements.get('percentage-0').textContent,'66.7');
  assert.match(elements.get('status').textContent,/reconnecting/);
  assert.equal(elements.get('bar-1')['data-losing'],'true');
  await tick();
  assert.equal(elements.get('bar-0')['data-losing'],'true');
  assert.equal(elements.get('bar-1')['data-losing'],'false');
  await tick();
  assert.equal(elements.get('bar-0')['data-losing'],'false');
  assert.equal(elements.get('bar-1')['data-losing'],'false');
});


