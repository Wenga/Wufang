import {cultureCards} from './culture-data.js';
let dialog,opener,previousOverflow;
function createDialog(){
  dialog=document.createElement('dialog');
  dialog.className='culture-dialog';
  dialog.setAttribute('aria-labelledby','culture-title');
  dialog.innerHTML=`<article class="culture-content"><button type="button" class="culture-close" aria-label="关闭卡片" autofocus>×</button><p class="culture-eyebrow">风物小记</p><div class="culture-art"><span>插画留白</span><img hidden alt=""></div><p class="culture-region"></p><h2 id="culture-title"></h2><p class="culture-copy"></p><details class="culture-sources"><summary>文化出处</summary><a target="_blank" rel="noopener noreferrer">阅读出处 ↗</a></details></article>`;
  document.body.append(dialog);
  dialog.querySelector('.culture-close').onclick=()=>dialog.close();
  let backdropDown=false;
  const outside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
  dialog.addEventListener('pointerdown',e=>{backdropDown=outside(e);});
  dialog.addEventListener('click',e=>{if(backdropDown&&outside(e))dialog.close();backdropDown=false;});
  dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;opener?.focus({preventScroll:true});});
}
export function openCulture(id,trigger){
  const card=cultureCards[id];if(!card)return;
  if(!dialog)createDialog();
  opener=trigger;
  dialog.querySelector('#culture-title').textContent=card.title;
  dialog.querySelector('.culture-region').textContent=card.region;
  dialog.querySelector('.culture-copy').textContent=card.text[0];
  dialog.querySelector('.culture-sources a').href=card.source;
  dialog.querySelector('.culture-sources a').textContent=card.sourceLabel;
  dialog.querySelector('details').open=false;
  const img=dialog.querySelector('img'),placeholder=dialog.querySelector('.culture-art span');
  img.hidden=true;img.removeAttribute('src');placeholder.hidden=false;
  if(card.image){img.onload=()=>{img.hidden=false;placeholder.hidden=true;};img.onerror=()=>{img.hidden=true;placeholder.hidden=false;};img.alt=card.title;img.src=card.image;}
  previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  dialog.showModal();dialog.scrollTop=0;
}
