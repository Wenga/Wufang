import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import QRCode from 'qrcode';
import {SessionStore} from './session-store.mjs';

export function validInput(data) {
  return data && ['guangzhou','xian','nanjing','puer','shenyang'].includes(data.city)
    && Array.isArray(data.tastes) && data.tastes.length >= 1 && data.tastes.length <= 2
    && new Set(data.tastes).size === data.tastes.length
    && data.tastes.every(t => ['清','厚','鲜','柔','烈'].includes(t));
}
export function createApp(port = 3000, {dataDir=null,duration=6000}={}) {
  const peers = new Set(), store=new SessionStore(dataDir);
  let current = null, timer;
  const manifest=()=>({type:'history',...store.state,records:store.state.records.filter(r=>r.end<=Date.now())});
  const waiting=()=>store.state.records.filter(r=>r.start>Date.now());
  const operator=req=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  const addresses = Object.values(networkInterfaces()).flat().filter(n => n.family === 'IPv4' && !n.internal).map(n => `http://${n.address}:${port}/join`);
  const files = {'/':'index.html','/join':'join.html','/screen':'screen.html','/style.css':'style.css','/app.js':'app.js','/ink.js':'ink.js','/fluid.js':'fluid.js','/brush.js':'brush.js','/artwork.js':'artwork.js','/i18n.js':'i18n.js','/favicon.svg':'favicon.svg','/landscape.png':'landscape.png'};
  const server = http.createServer(async (req,res) => {
    try {
      const url = new URL(req.url,'http://localhost');
      if(url.pathname==='/api/artwork'){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');return res.end(JSON.stringify(manifest()));}
      if(url.pathname==='/api/new-session'){
        if(req.method!=='POST'||!operator(req)||req.headers['x-wufang-action']!=='new-session'){res.writeHead(403);return res.end('仅现场电脑可开始新一场');}
        if(current||waiting().length){res.writeHead(409);return res.end('请等待所有落笔播放完成，再开始新一场。');}
        store.reset();broadcast(manifest());status();res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({ok:true}));
      }
      if (url.pathname === '/api/network') { res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({addresses})); }
      if (url.pathname === '/qr') {
        const target = url.searchParams.get('url');
        if (!addresses.includes(target)) { res.writeHead(400); return res.end('Invalid address'); }
        res.setHeader('Content-Type','image/svg+xml'); return res.end(await QRCode.toString(target,{type:'svg',margin:1,color:{dark:'#20211f',light:'#ffffff'}}));
      }
      if (!files[url.pathname]) { res.writeHead(404); return res.end('Not found'); }
      const filename = files[url.pathname];
      res.setHeader('Content-Type', filename.endsWith('.png')?'image/png':filename.endsWith('.css')?'text/css':filename.endsWith('.js')?'text/javascript':filename.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8');
      res.setHeader('Cache-Control','no-store');
      res.end(await readFile(new URL(`./public/${filename}`,import.meta.url)));
    } catch { res.writeHead(500); res.end('Server error'); }
  });
  const wss = new WebSocketServer({server,maxPayload:2048});
  const send = (ws,data) => { if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); };
  const broadcast = data => peers.forEach(ws => send(ws,data));
  const status = () => broadcast({type:'status',screens:[...peers].filter(p=>p.role==='screen').length,waiting:waiting().length,busy:!!current});
  const next = () => {
    clearTimeout(timer);
    const now=Date.now(),previous=current;
    current=store.state.records.find(r=>r.start<=now&&r.end>now)||null;
    if(previous?.id!==current?.id){
      broadcast(manifest());
      if(current)broadcast({type:'stroke',...current});
    }
    const future=waiting()[0];
    if(current||future)timer=setTimeout(next,Math.max(1,(current?.end||future.start)-now));
    status();
  };
  wss.on('connection',(ws,req) => {
    ws.role = new URL(req.url,'http://localhost').searchParams.get('role') === 'screen' ? 'screen':'guest';
    ws.lastSubmit = 0;ws.operator=operator(req); peers.add(ws);
    send(ws,manifest());
    send(ws,{type:"operator",allowed:ws.operator});
    if(current) send(ws,{type:'stroke',...current});
    status();
    ws.on('message',raw => {
      let data; try {data=JSON.parse(raw);} catch {return send(ws,{type:'error',message:'这笔没有送出，请重试。'});}
      if(data?.type==='settings'){
        if(!ws.operator)return send(ws,{type:'error',message:'请在现场电脑调整作品设置。'});
        const v=data.settings;
        if(!v||typeof v.landscape!=='boolean'||!Number.isFinite(v.height)||v.height<.3||v.height>.7||!Number.isFinite(v.fontSize)||v.fontSize<15||v.fontSize>50)return;
        try{store.settings({landscape:v.landscape,height:v.height,fontSize:v.fontSize});broadcast({type:'settings',settings:store.state.settings});}catch{return send(ws,{type:'error',message:'设置未能保存，请检查电脑存储空间。'});}
        return;
      }
      if(data?.type !== 'submit'  || !validInput(data)) return send(ws,{type:'error',message:'请选择一座城市和 1–2 个味觉词。'});
      if(![...peers].some(p=>p.role==='screen')) return send(ws,{type:'error',message:'装置尚未连接，请稍后再试。'});
      if(Date.now()-ws.lastSubmit<2000) return send(ws,{type:'error',message:'请稍候片刻再落笔。'});
      if(waiting().length>=12) return send(ws,{type:'error',message:'此刻落笔的人较多，请稍后再试。'});
      ws.lastSubmit=Date.now();
      const start=Math.max(Date.now(),store.state.records.at(-1)?.end||0);
      const entry={city:data.city,tastes:data.tastes,id:crypto.randomUUID(),seed:Math.random(),start,end:start+duration};
      const ahead=waiting().length+(current?1:0);
      try{store.append(entry);}catch{return send(ws,{type:'error',message:'这一笔未能保存，请检查电脑存储空间后重试。'});}
      send(ws,{type:'accepted',id:entry.id,ahead});next();status();
    });
    ws.on('close',()=>{peers.delete(ws);status();});
  });
  server.on('listening',next);
  server.on('close',()=>{clearTimeout(timer);wss.close();});
  return {server,wss};
}
if(process.argv[1] === fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT||3000);
  const {server}=createApp(port,{dataDir:fileURLToPath(new URL('./data/',import.meta.url))});
  server.listen(port,'0.0.0.0',()=>console.log(`五方入味 · http://localhost:${port}`));
}
