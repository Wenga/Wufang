import {test} from 'node:test';import assert from 'node:assert/strict';import {normalize,browse,complete} from './dist/state.js';import {steps,stages} from './dist/data.js';
test('browsing never changes completion',()=>{const s={view:3,done:[0,2]};assert.deepEqual(browse(s,8,19),{view:8,done:[0,2]});assert.deepEqual(s,{view:3,done:[0,2]})});
test('complete marks only viewed step and advances; no duplicate',()=>{let s=complete({view:4,done:[0]},19);assert.deepEqual(s,{view:5,done:[0,4]});assert.deepEqual(complete({view:18,done:[18]},19),{view:18,done:[18]})});
test('persisted data survives and invalid data is cleaned',()=>{const s={view:4,done:[0,3]};assert.deepEqual(normalize(JSON.parse(JSON.stringify(s)),19),s);assert.deepEqual(normalize({view:-1,done:[0,0,-1,90,'1']},19),{view:0,done:[0]})});
test('all eight stages represented in sequence',()=>{assert.deepEqual([...new Set(steps.map(x=>x.stage))],stages.map((_,i)=>i))});
