import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {createApp,validInput} from '../server.mjs';
import {tasteProfile} from '../public/ink.js';
test('accept only one city and one or two distinct known tastes',()=>{
  assert.equal(validInput({city:'nanjing',tastes:['鲜','柔']}),true);
  for(const data of [{city:'other',tastes:['清']},{city:'nanjing',tastes:[]},{city:'nanjing',tastes:['清','厚','烈']},{city:'nanjing',tastes:['清','清']},{city:'nanjing',tastes:['unknown']}])assert.equal(validInput(data),false);
});
test('taste combinations preserve their expressive differences',()=>{
  assert.ok(tasteProfile(['厚']).width>tasteProfile(['清']).width);
  assert.ok(tasteProfile(['烈']).speed>tasteProfile(['柔']).speed);
  assert.ok(tasteProfile(['鲜','柔']).dots>tasteProfile(['柔']).dots);
  assert.ok(tasteProfile(['厚','烈']).dry>tasteProfile(['厚']).dry);
});
test('phone submits, display receives, second entry queues, reconnect receives current stroke',async()=>{
  const {server,wss}=createApp(0);server.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`,clients=[];
  const connect=async role=>{const ws=new WebSocket(base.replace('http','ws')+`/?role=${role}`);ws.messages=[];ws.on('message',m=>ws.messages.push(JSON.parse(m)));clients.push(ws);await once(ws,'open');return ws;};
  const waitFor=async(ws,type)=>{for(let i=0;i<100;i++){const m=ws.messages.find(m=>m.type===type);if(m)return m;await new Promise(r=>setTimeout(r,20));}throw Error(`Missing ${type}`);};
  try{
    for(const route of ['/','/join','/screen','/app.js','/ink.js'])assert.equal((await fetch(base+route)).status,200);
    assert.equal((await fetch(base+'/missing')).status,404);
    const guest=await connect('guest');guest.send(JSON.stringify({type:'submit',city:'nanjing',tastes:['鲜']}));assert.match((await waitFor(guest,'error')).message,/尚未连接/);
    const display=await connect('screen');guest.send(JSON.stringify({type:'submit',city:'nanjing',tastes:['鲜','柔']}));
    const accepted=await waitFor(guest,'accepted'),stroke=await waitFor(display,'stroke');assert.equal(accepted.id,stroke.id);assert.equal(stroke.city,'nanjing');
    const second=await connect('guest');second.send(JSON.stringify({type:'submit',city:'puer',tastes:['厚']}));assert.equal((await waitFor(second,'accepted')).ahead,1);
    const resumed=await connect('screen');assert.equal((await waitFor(resumed,'stroke')).id,stroke.id);
  }finally{for(const ws of clients)ws.terminate();for(const ws of wss.clients)ws.terminate();await new Promise(r=>server.close(r));}
});
