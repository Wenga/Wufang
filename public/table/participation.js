const copy={open:['留下味觉印象','留下味覺印象','Share your taste impression'],title:['留下此刻的味道','留下此刻的味道','A taste of this moment'],hint:['选择 1–2 个味觉印象','選擇 1–2 個味覺印象','Choose 1–2 impressions'],submit:['落下一笔','落下一筆','Leave a stroke'],close:['关闭','關閉','Close'],connected:['装置已连接','裝置已連線','Display connected'],offline:['等待装置连接','等待裝置連線','Waiting for the display'],reconnect:['连接中断，正在重连…','連線中斷，正在重連…','Reconnecting…'],sending:['正在送出这一笔…','正在送出這一筆…','Sending your stroke…'],accepted:['已送达，请看桌上的装置屏幕。','已送達，請看桌上的裝置螢幕。','Sent. Please look at the display on the table.'],queued:['正在排队，请留意桌上的装置屏幕。','正在排隊，請留意桌上的裝置螢幕。','Queued. Please watch the display on the table.'],uncertain:['暂未收到确认，请先查看装置再试。','暫未收到確認，請先查看裝置再試。','No confirmation yet. Check the display before retrying.'],error:['这一笔未能送出，请稍后重试。','這一筆未能送出，請稍後重試。','Unable to send. Please try again shortly.']};
const tastes=[['清','清','Light'],['厚','厚','Rich'],['鲜','鮮','Umami'],['柔','柔','Gentle'],['烈','烈','Bold']];
export function initParticipation(context){
  const area=document.createElement('div');area.className='participation';area.innerHTML='<button class="impression-open" type="button"></button><p class="impression-connection" role="status"></p>';
  document.querySelector('.detail').append(area);
  const dialog=document.createElement('dialog');dialog.className='impression-dialog';dialog.setAttribute('aria-labelledby','impression-title');
  dialog.innerHTML='<button class="impression-close" type="button">×</button><p class="impression-city"></p><h2 id="impression-title"></h2><p class="impression-hint"></p><div class="impression-tastes"></div><button class="impression-submit" type="button"></button><p class="impression-feedback" role="status" aria-live="polite"></p>';
  document.body.append(dialog);
  const q=s=>dialog.querySelector(s),open=area.querySelector('button');
  let socket,connected=false,screens=0,selected=[],pending=false,finished=false,message='',timer,retryTimer,chosen;
  const t=key=>copy[key][context().lang];
  for(const [i,row] of tastes.entries()){const button=document.createElement('button');button.type='button';button.dataset.index=i;button.onclick=()=>{if(pending||finished)return;if(selected.includes(i))selected=selected.filter(v=>v!==i);else if(selected.length<2)selected.push(i);refresh();};q('.impression-tastes').append(button);}
  function refresh(){
    const {lang}=context();open.textContent=t('open');open.disabled=pending;area.querySelector('p').textContent=t(connected&&screens?'connected':connected?'offline':'reconnect');
    q('.impression-close').setAttribute('aria-label',t('close'));q('.impression-city').textContent=(chosen||context().city).name[lang];q('h2').textContent=t('title');q('.impression-hint').textContent=t('hint');q('.impression-submit').textContent=t(pending?'sending':'submit');q('.impression-submit').disabled=pending||finished||!connected||!screens||!selected.length;
    q('.impression-feedback').textContent=message?t(message):'';
    q('.impression-feedback').classList.toggle('is-success',message==='accepted'||message==='queued');
    q('.impression-tastes').querySelectorAll('button').forEach((b,i)=>{b.textContent=tastes[i][lang];b.setAttribute('aria-pressed',String(selected.includes(i)));b.disabled=pending||finished;});
  }
  open.onclick=()=>{chosen=context().city;selected=[];pending=false;finished=false;message='';refresh();dialog.showModal();};
  q('.impression-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>open.focus({preventScroll:true}));
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
  q('.impression-submit').onclick=()=>{if(pending||finished||!connected||!screens||!selected.length)return;pending=true;message='sending';refresh();socket.send(JSON.stringify({type:'submit',city:chosen.id,tastes:selected.map(i=>tastes[i][0])}));timer=setTimeout(()=>{pending=false;finished=true;message='uncertain';refresh();},8000);};
  function connect(){socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/?role=guest`);socket.onopen=()=>{connected=true;refresh();};socket.onmessage=e=>{let data;try{data=JSON.parse(e.data);}catch{return;}if(data.type==='status'){screens=data.screens;refresh();}if(data.type==='accepted'&&pending){clearTimeout(timer);pending=false;finished=true;message=data.ahead?'queued':'accepted';refresh();}if(data.type==='error'&&pending){clearTimeout(timer);pending=false;message='error';refresh();}};socket.onclose=()=>{connected=false;screens=0;if(pending){clearTimeout(timer);pending=false;finished=true;message='uncertain';}refresh();retryTimer=setTimeout(connect,1500);};socket.onerror=()=>socket.close();}
  connect();window.addEventListener('pagehide',()=>{clearTimeout(timer);clearTimeout(retryTimer);socket.onclose=null;socket.close();});window.addEventListener('pageshow',e=>{if(e.persisted)connect();});
  return {refresh};
}
