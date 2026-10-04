import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WetInk} from '../public/fluid.js';
test('pigment advects, stays finite and dissipates after injection stops',()=>{
  const ink=new WetInk(64);ink.splat(0,0,8,1,9,3);
  const initial=ink.d.slice(),mass=ink.d.reduce((a,b)=>a+b,0);
  for(let frame=0;frame<180;frame++)ink.step(1/30,.65);
  assert.ok(ink.d.reduce((a,b)=>a+b,0)<mass*.1);
  assert.notDeepEqual(ink.d,initial);
  for(const key of ['d','u','v'])assert.ok(ink[key].every(Number.isFinite));
  assert.ok(ink.d.every(n=>n>=0));
});
test('sustained ripple injection stays bounded',()=>{
  const ink=new WetInk(48);
  for(let frame=0;frame<900;frame++){
    const angle=frame*.07;ink.splat(Math.cos(angle)*38,Math.sin(angle)*28,3,.08,Math.cos(angle)*2,Math.sin(angle)*2);ink.step();
  }
  assert.ok(ink.d.every(n=>Number.isFinite(n)&&n>=0&&n<=4));
});
