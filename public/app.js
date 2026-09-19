import {Ink,cities} from './ink.js';
const page=document.body.dataset.page;
const $=id=>document.getElementById(id);
const ink=$('ink')?new Ink($('ink'),label=>{if($('stage-label'))$('stage-label').textContent=label;}):null;
let city=null,tastes=[],socket,connected=false,screens=0,sending=false,acceptedId=null,received=new Set(),ackTimer,finishTimer;
const hints={'清':'淡墨 · 细笔 · 留白','厚':'重墨 · 宽笔 · 缓染','鲜':'碎点 · 轻跃 · 灵动','柔':'曲线 · 慢行 · 柔边','烈':'飞白 · 疾笔 · 顿挫'};
if($('form-root')){
  $('form-root').innerHTML=`<form id="taste-form"><fieldset><legend>01　选择一座城市</legend><div class="cities">${cities.map(c=>`<button class="city" type="button" data-city="${c.id}" aria-pressed="false">${c.name}</button>`).join('')}</div></fieldset><fieldset><legend>02　留下味觉印象 <small>选择 1–2 项</small></legend><div class="tastes">${Object.keys(hints).map(t=>`<button class="taste" type="button" data-taste="${t}" aria-pressed="false">${t}</button>`).join('')}</div><p class="taste-hint" id="taste-hint">清、厚、鲜、柔、烈，哪一种更接近此刻？</p></fieldset><button class="submit" id="submit" type="submit" disabled>落下一笔</button><div class="feedback" id="feedback" role="status" aria-live="polite"></div></form>`;
  document.querySelectorAll('[data-city]').forEach(b=>b.onclick=()=>{city=b.dataset.city;document.querySelectorAll('[data-city]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));update();});
  document.querySelectorAll('[data-taste]').forEach(b=>b.onclick=()=>{const t=b.dataset.taste;if(tastes.includes(t))tastes=tastes.filter(v=>v!==t);else if(tastes.length<2)tastes.push(t);else{feedback('最多选择两个味觉词，先取消一个即可更换。');return;}document.querySelectorAll('[data-taste]').forEach(n=>n.setAttribute('aria-pressed',String(tastes.includes(n.dataset.taste))));$('taste-hint').textContent=tastes.length?tastes.map(t=>hints[t]).join(' / '):'清、厚、鲜、柔、烈，哪一种更接近此刻？';update();});
  $('taste-form').onsubmit=e=>{e.preventDefault();if(!connected||!screens||!city||!tastes.length||sending)return;sending=true;update();feedback('正在送出这一笔…');socket.send(JSON.stringify({type:'submit',city,tastes}));ackTimer=setTimeout(()=>{sending=false;feedback('未收到确认，请查看装置后再试。');update();},8000);};
}
function feedback(message){if($('feedback'))$('feedback').textContent=message;}
function update(){if($('submit')){$('submit').disabled=!(connected&&screens&&city&&tastes.length&&!sending);$('submit').textContent=sending?'正在落笔…':'落下一笔';}}
function connect(){
  socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/?role=${ink?'screen':'guest'}`);
  socket.onopen=()=>{connected=true;update();};
  socket.onmessage=e=>{
    const data=JSON.parse(e.data);
    if(data.type==='status'){screens=data.screens;$('connection').textContent=screens?`装置已连接${data.waiting?` · ${data.waiting} 笔等候中`:''}`:'等待装置连接';update();}
    if(data.type==='accepted'){clearTimeout(ackTimer);sending=false;acceptedId=data.id;feedback(data.ahead?`这一笔已收下，前面还有 ${data.ahead} 笔。请留意眼前的宣纸。`:'这一笔已送达，请看眼前的宣纸。');update();}
    if(data.type==='stroke'){
      if(!received.has(data.id)){received.add(data.id);if(received.size>100)received.delete(received.values().next().value);ink?.add(data);if(ink){const s=ink.strokes.find(s=>s.id===data.id);if(s)s.label=data.tastes.join(' · ');}if(data.id===acceptedId){feedback('属于你的这一笔，正在纸上展开。');clearTimeout(finishTimer);finishTimer=setTimeout(()=>{if(acceptedId===data.id)feedback('这一笔已落下，余韵留在纸上。');},Math.max(0,6000-(Date.now()-data.start)));}}
    }
    if(data.type==='error'){clearTimeout(ackTimer);sending=false;feedback(data.message);update();}
  };
  socket.onclose=()=>{connected=false;screens=0;clearTimeout(ackTimer);if(sending)feedback('连接中断，请查看装置后再试。');sending=false;$('connection').textContent='连接中断，正在重连…';update();setTimeout(connect,1500);};
  socket.onerror=()=>socket.close();
}
connect();
if(ink){
  $('paper-toggle').onchange=e=>{ink.paper=e.target.checked;};
  $('paper-height').oninput=e=>{ink.height=Number(e.target.value)/100;$('paper-value').textContent=`${e.target.value}%`;};
  if(page==='screen'){
    $('background').onchange=e=>{$('canvas-wrap').style.background=e.target.value;};
    const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('connection').textContent='请使用浏览器菜单进入全屏';}};
    $('fullscreen').onclick=fullscreen;$('canvas-wrap').ondblclick=fullscreen;
    document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='h'&&!['INPUT','SELECT'].includes(e.target.tagName))$('screen-settings').hidden=!$('screen-settings').hidden;});
    setTimeout(()=>{$('screen-settings').hidden=true;},10000);
  }
}
if($('network')){
  fetch('/api/network').then(r=>r.json()).then(({addresses})=>{
    if(!addresses.length){$('join-url').textContent='尚未检测到局域网地址，请连接 Wi-Fi 后重启服务。';$('qr').hidden=true;return;}
    for(const address of addresses){const option=document.createElement('option');option.value=address;option.textContent=address;$('network').append(option);}
    const refresh=()=>{const address=$('network').value;$('join-url').href=address;$('join-url').textContent=address;$('qr').src=`/qr?url=${encodeURIComponent(address)}`;};$('network').onchange=refresh;refresh();
  }).catch(()=>{$('join-url').textContent='暂时无法获取连接地址，请刷新重试。';$('qr').hidden=true;});
}
