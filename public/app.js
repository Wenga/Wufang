import {Ink,cities} from './ink.js';
import {exportArtwork} from './artwork.js';
import {initLanguage} from './i18n.js';
const translateUI=initLanguage();
const page=document.body.dataset.page;
const $=id=>document.getElementById(id);
const ink=$('ink')?new Ink($('ink'),label=>{if($('stage-label'))$('stage-label').textContent=label;}):null;
let city=null,tastes=[],socket,connected=false,screens=0,sending=false,acceptedId=null,received=new Set(),ackTimer,finishTimer;
let sessionId=null,operator=false,settingsTimer;
const hints={'清':'淡墨 · 细笔 · 留白','厚':'重墨 · 宽笔 · 缓染','鲜':'碎点 · 轻跃 · 灵动','柔':'曲线 · 慢行 · 柔边','烈':'飞白 · 疾笔 · 顿挫'};
if($('form-root')){
  $('form-root').innerHTML=`<form id="taste-form"><fieldset><legend>01　选择一座城市</legend><div class="cities">${cities.map(c=>`<button class="city" type="button" data-city="${c.id}" aria-pressed="false">${c.name}</button>`).join('')}</div></fieldset><fieldset><legend>02　留下味觉印象 <small>选择 1–2 项</small></legend><div class="tastes">${Object.keys(hints).map(t=>`<button class="taste" type="button" data-taste="${t}" aria-pressed="false">${t}</button>`).join('')}</div><p class="taste-hint" id="taste-hint">清、厚、鲜、柔、烈，哪一种更接近此刻？</p></fieldset><button class="submit" id="submit" type="submit" disabled>落下一笔</button><div class="feedback" id="feedback" role="status" aria-live="polite"></div></form>`;
  document.querySelectorAll('[data-city]').forEach(b=>b.onclick=()=>{city=b.dataset.city;document.querySelectorAll('[data-city]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));update();});
  document.querySelectorAll('[data-taste]').forEach(b=>b.onclick=()=>{const t=b.dataset.taste;if(tastes.includes(t))tastes=tastes.filter(v=>v!==t);else if(tastes.length<2)tastes.push(t);else{feedback('最多选择两个味觉词，先取消一个即可更换。');return;}document.querySelectorAll('[data-taste]').forEach(n=>n.setAttribute('aria-pressed',String(tastes.includes(n.dataset.taste))));$('taste-hint').textContent=tastes.length?tastes.map(t=>hints[t]).join(' / '):'清、厚、鲜、柔、烈，哪一种更接近此刻？';update();});
  $('taste-form').onsubmit=e=>{e.preventDefault();if(!connected||!screens||!city||!tastes.length||sending)return;sending=true;update();feedback('正在送出这一笔…');socket.send(JSON.stringify({type:'submit',city,tastes}));ackTimer=setTimeout(()=>{sending=false;feedback('未收到确认，请查看装置后再试。');update();},8000);};
}
function feedback(message){const target=$('feedback')||$('download-status');if(target)target.textContent=message;}
function update(){if($('submit')){$('submit').disabled=!(connected&&screens&&city&&tastes.length&&!sending);$('submit').textContent=sending?'正在落笔…':'落下一笔';}}
function connect(){
  socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/?role=${ink?'screen':'guest'}`);
  socket.onopen=()=>{connected=true;update();};
  socket.onmessage=e=>{
    const data=JSON.parse(e.data);
    if(data.type==='history'){
      if(sessionId!==data.id){sessionId=data.id;received.clear();if(ink)ink.strokes=[];acceptedId=null;clearTimeout(finishTimer);}
      if(ink)ink.artwork.set(data.records);
      applySettings(data.settings);
      $('artwork-count').textContent=`共同作品 · 已留下 ${data.records.length} 笔`;
    }
    if(data.type==='settings')applySettings(data.settings);
    if(data.type==='operator'){operator=data.allowed;if($('new-session'))$('new-session').hidden=!operator;}
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
const saveArea=document.createElement('div');saveArea.className='artwork-actions';
saveArea.innerHTML='<p id="artwork-count">共同作品 · 正在读取</p><button id="download-artwork" type="button">保存此刻的风味手卷 ↓</button><p id="download-status" role="status" aria-live="polite"></p><a id="image-fallback" hidden target="_blank" rel="noopener">打开图片，长按保存</a>';
($('form-root')||$('screen-settings')).append(saveArea);
let exportUrl;
$('download-artwork').onclick=async()=>{
  const button=$('download-artwork');button.disabled=true;$('download-status').textContent='正在绘制你的风味手卷…';
  try{
    const response=await fetch('/api/artwork',{cache:'no-store'});if(!response.ok)throw Error();
    const manifest=await response.json(),blob=await exportArtwork(manifest);
    if(exportUrl)URL.revokeObjectURL(exportUrl);exportUrl=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=exportUrl;link.download=`Compass-of-taste-${new Date(manifest.createdAt).toISOString().slice(0,10)}-${manifest.records.length}.png`;document.body.append(link);link.click();link.remove();
    $('image-fallback').href=exportUrl;$('image-fallback').hidden=false;
    $('download-status').textContent=`已生成 ${manifest.records.length} 笔共同作品。若未自动下载，可打开图片保存。`;
  }catch{$('download-status').textContent='未能生成图片，请保持活动 Wi-Fi 连接后重试。';}
  finally{button.disabled=false;}
};
function applySettings(settings){
  if(!ink)return;
  ink.landscapeEnabled=settings.landscape;ink.height=settings.height;ink.cityFontSize=settings.fontSize;
  $('landscape-toggle').checked=settings.landscape;$('paper-height').value=Math.round(settings.height*100);$('paper-value').textContent=`${Math.round(settings.height*100)}%`;
  $('city-font-size').value=Math.round(settings.fontSize*4);$('city-font-value').textContent=`${Math.round(settings.fontSize*4)}%`;
}
function saveSettings(){
  if(!operator)return;
  clearTimeout(settingsTimer);settingsTimer=setTimeout(()=>{if(connected)socket.send(JSON.stringify({type:'settings',settings:{landscape:ink.landscapeEnabled,height:ink.height,fontSize:ink.cityFontSize}}));},180);
}
connect();
if(ink){
  const resetButton=document.createElement('button');resetButton.id='new-session';resetButton.type='button';resetButton.hidden=true;resetButton.textContent='开始新一场';
  ($('screen-settings')||document.querySelector('.setup-grid')).append(resetButton);
  resetButton.onclick=async()=>{
    if(!confirm(translateUI('当前作品会归档保留，屏幕将清空并开始新一场。是否继续？')))return;
    resetButton.disabled=true;
    try{const response=await fetch('/api/new-session',{method:'POST',headers:{'X-Wufang-Action':'new-session'}});if(!response.ok)throw Error(await response.text());$('download-status').textContent='已开始新一场，上一场记录已归档。';}
    catch(error){$('download-status').textContent=error.message||'操作失败，请重试。';}finally{resetButton.disabled=false;}
  };
  for(const id of ['landscape-toggle','paper-height','city-font-size'])$(id).addEventListener('change',saveSettings);

  $('ripple-city').onchange=e=>{ink.setRippleCity(e.target.value);};
  $('landscape-toggle').onchange=e=>{ink.landscapeEnabled=e.target.checked;};
  $('paper-toggle').onchange=e=>{ink.paper=e.target.checked;};
  $('paper-height').oninput=e=>{ink.height=Number(e.target.value)/100;$('paper-value').textContent=`${e.target.value}%`;};
  $('city-font-size').oninput=e=>{ink.cityFontSize=25*Number(e.target.value)/100;$('city-font-value').textContent=`${e.target.value}%`;};
  $('particle-size').oninput=e=>{ink.particleScale=Number(e.target.value)/100;$('particle-value').textContent=`${e.target.value}%`;};
  if(page==='screen'){
    $('background').onchange=e=>{$('canvas-wrap').style.background=e.target.value;};
    const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('connection').textContent='请使用浏览器菜单进入全屏';}};
    $('fullscreen').onclick=fullscreen;$('canvas-wrap').ondblclick=fullscreen;
    document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='h'&&!['INPUT','SELECT'].includes(e.target.tagName))$('screen-settings').hidden=!$('screen-settings').hidden;});
    let hideSettings=setTimeout(()=>{$('screen-settings').hidden=true;},10000);
    $('screen-settings').addEventListener('pointerdown',()=>clearTimeout(hideSettings));
    $('screen-settings').addEventListener('focusin',()=>clearTimeout(hideSettings));
  }
}
if($('network')){
  fetch('/api/network').then(r=>r.json()).then(({addresses})=>{
    if(!addresses.length){$('join-url').textContent='尚未检测到局域网地址，请连接 Wi-Fi 后重启服务。';$('qr').hidden=true;return;}
    for(const address of addresses){const option=document.createElement('option');option.value=address;option.textContent=address;$('network').append(option);}
    const refresh=()=>{const address=$('network').value;$('join-url').href=address;$('join-url').textContent=address;$('qr').src=`/qr?url=${encodeURIComponent(address)}`;};$('network').onchange=refresh;refresh();
  }).catch(()=>{$('join-url').textContent='暂时无法获取连接地址，请刷新重试。';$('qr').hidden=true;});
}
