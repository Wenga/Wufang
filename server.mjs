import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import QRCode from 'qrcode';

export function validInput(data) {
  return data && ['guangzhou','xian','nanjing','puer','shenyang'].includes(data.city)
    && Array.isArray(data.tastes) && data.tastes.length >= 1 && data.tastes.length <= 2
    && new Set(data.tastes).size === data.tastes.length
    && data.tastes.every(t => ['清','厚','鲜','柔','烈'].includes(t));
}
export function createApp(port = 3000) {
  const peers = new Set(), pending = [];
  let current = null, timer;
  const addresses = Object.values(networkInterfaces()).flat().filter(n => n.family === 'IPv4' && !n.internal).map(n => `http://${n.address}:${port}/join`);
  const files = {'/':'index.html','/join':'join.html','/screen':'screen.html','/style.css':'style.css','/app.js':'app.js','/ink.js':'ink.js','/favicon.svg':'favicon.svg'};
  const server = http.createServer(async (req,res) => {
    try {
      const url = new URL(req.url,'http://localhost');
      if (url.pathname === '/api/network') { res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({addresses})); }
      if (url.pathname === '/qr') {
        const target = url.searchParams.get('url');
        if (!addresses.includes(target)) { res.writeHead(400); return res.end('Invalid address'); }
        res.setHeader('Content-Type','image/svg+xml'); return res.end(await QRCode.toString(target,{type:'svg',margin:1,color:{dark:'#20211f',light:'#ffffff'}}));
      }
      if (!files[url.pathname]) { res.writeHead(404); return res.end('Not found'); }
      const filename = files[url.pathname];
      res.setHeader('Content-Type', filename.endsWith('.css')?'text/css':filename.endsWith('.js')?'text/javascript':filename.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8');
      res.setHeader('Cache-Control','no-store');
      res.end(await readFile(new URL(`./public/${filename}`,import.meta.url)));
    } catch { res.writeHead(500); res.end('Server error'); }
  });
  const wss = new WebSocketServer({server,maxPayload:2048});
  const send = (ws,data) => { if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); };
  const broadcast = data => peers.forEach(ws => send(ws,data));
  const status = () => broadcast({type:'status',screens:[...peers].filter(p=>p.role==='screen').length,waiting:pending.length,busy:!!current});
  const next = () => {
    if(current || !pending.length) return;
    current = {...pending.shift(),start:Date.now()};
    broadcast({type:'stroke',...current}); status();
    timer = setTimeout(()=>{current=null;next();status();},6000);
  };
  wss.on('connection',(ws,req) => {
    ws.role = new URL(req.url,'http://localhost').searchParams.get('role') === 'screen' ? 'screen':'guest';
    ws.lastSubmit = 0; peers.add(ws);
    if(current) send(ws,{type:'stroke',...current});
    status();
    ws.on('message',raw => {
      let data; try {data=JSON.parse(raw);} catch {return send(ws,{type:'error',message:'这笔没有送出，请重试。'});}
      if(data.type !== 'submit' || !validInput(data)) return send(ws,{type:'error',message:'请选择一座城市和 1–2 个味觉词。'});
      if(![...peers].some(p=>p.role==='screen')) return send(ws,{type:'error',message:'装置尚未连接，请稍后再试。'});
      if(Date.now()-ws.lastSubmit<2000) return send(ws,{type:'error',message:'请稍候片刻再落笔。'});
      if(pending.length>=12) return send(ws,{type:'error',message:'此刻落笔的人较多，请稍后再试。'});
      ws.lastSubmit=Date.now();
      const entry={city:data.city,tastes:data.tastes,id:crypto.randomUUID(),seed:Math.random()};
      const ahead=pending.length+(current?1:0); pending.push(entry);
      send(ws,{type:'accepted',id:entry.id,ahead}); next();status();
    });
    ws.on('close',()=>{peers.delete(ws);status();});
  });
  server.on('close',()=>{clearTimeout(timer);wss.close();});
  return {server,wss};
}
if(process.argv[1] === fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT||3000);
  const {server}=createApp(port);
  server.listen(port,'0.0.0.0',()=>console.log(`五方入味 · http://localhost:${port}`));
}
