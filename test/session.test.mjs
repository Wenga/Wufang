import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {SessionStore} from '../session-store.mjs';
import {createApp} from '../server.mjs';

test('session records survive restart; new session archives old work',()=>{
  const dir=mkdtempSync(join(tmpdir(),'wufang-session-'));
  try{
    const store=new SessionStore(dir),id=store.state.id;
    store.append({id:'one',city:'nanjing',tastes:['清'],seed:.123,start:10,end:20});
    store.settings({landscape:false});
    const restored=new SessionStore(dir);assert.equal(restored.state.records.length,1);assert.equal(restored.state.settings.landscape,false);
    restored.reset();assert.notEqual(restored.state.id,id);assert.equal(restored.state.records.length,0);
    assert.equal(JSON.parse(readFileSync(join(dir,`session-${id}.json`),'utf8')).records[0].seed,.123);
    assert.equal(existsSync(join(dir,'current.json.tmp')),false);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('download manifest contains completed strokes and persists across server restart',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'wufang-live-'));let app,ws;
  async function start(){app=createApp(0,{dataDir:dir,duration:120});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');return `http://127.0.0.1:${app.server.address().port}`;}
  async function stop(){ws?.terminate();for(const client of app.wss.clients)client.terminate();await new Promise(r=>app.server.close(r));}
  try{
    let base=await start();ws=new WebSocket(base.replace('http','ws')+'/?role=screen');const messages=[];ws.on('message',m=>messages.push(JSON.parse(m)));await once(ws,'open');
    ws.send(JSON.stringify({type:'submit',city:'puer',tastes:['厚','柔']}));
    for(let i=0;i<100&&!messages.some(m=>m.type==='accepted');i++)await new Promise(r=>setTimeout(r,5));
    const accepted=messages.find(m=>m.type==='accepted');assert.ok(accepted);
    assert.equal(new SessionStore(dir).state.records[0].id,accepted.id);
    const early=await (await fetch(base+'/api/artwork')).json();assert.equal(early.records.length,0);
    await new Promise(r=>setTimeout(r,150));
    const done=await (await fetch(base+'/api/artwork')).json();assert.equal(done.records.length,1);
    await stop();base=await start();const restored=await (await fetch(base+'/api/artwork')).json();assert.deepEqual(restored,done);
    assert.equal((await fetch(base+'/api/new-session',{method:'POST'})).status,403);
    assert.equal((await fetch(base+'/api/new-session',{method:'POST',headers:{'X-Wufang-Action':'new-session'}})).status,200);
    assert.equal((await (await fetch(base+'/api/artwork')).json()).records.length,0);
  }finally{await stop();rmSync(dir,{recursive:true,force:true});}
});
