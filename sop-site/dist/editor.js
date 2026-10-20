const key='wufang-sop-content-v1';
export function validSection(value){return Array.isArray(value)&&value.every(x=>x&&['JW','LZ','共同'].includes(x.owner)&&typeof x.text==='string'&&x.text.trim()&&typeof x.when==='string');}
export function loadEdits(steps){try{const edits=JSON.parse(localStorage.getItem(key)||'{}');for(const s of steps){const e=edits[s.id];if(e&&validSection(e.flow)&&validSection(e.food)){s.flow=e.flow;s.food=e.food}}}catch{}}
export function setupEditor(steps,getView,onSave){
const dialog=document.getElementById('editorDialog'),form=document.getElementById('editorForm'),error=document.getElementById('editError');let editing=0;
function row(type,item={owner:'共同',text:'',when:''}){const box=document.createElement('div');box.className='editrow';
const who=document.createElement('select');who.setAttribute('aria-label','负责人');for(const [value,label] of [['JW','JW · 绿色'],['LZ','LZ · 红色'],['共同','两人共同']]){const o=document.createElement('option');o.value=value;o.textContent=label;who.append(o)}who.value=item.owner;
const text=document.createElement('textarea');text.setAttribute('aria-label','任务内容');text.placeholder='输入任务内容';text.rows=2;text.required=true;text.value=item.text;
const when=document.createElement('input');when.setAttribute('aria-label','执行时机');when.placeholder='执行时机（可选，如：宾客吃饭时）';when.value=item.when;
const remove=document.createElement('button');remove.type='button';remove.textContent='删除';remove.className='textbutton';remove.onclick=()=>box.remove();
box.append(who,text,when,remove);document.getElementById('edit-'+type).append(box)}
document.getElementById('edit').onclick=()=>{editing=getView();document.getElementById('editTitle').textContent='编辑 · '+steps[editing].title;error.textContent='';for(const type of ['flow','food']){document.getElementById('edit-'+type).replaceChildren();steps[editing][type].forEach(item=>row(type,item))}dialog.showModal()};
for(const type of ['flow','food'])document.getElementById('add-'+type).onclick=()=>row(type);
document.getElementById('cancelEdit').onclick=()=>dialog.close();
form.onsubmit=e=>{e.preventDefault();const result={};for(const type of ['flow','food']){result[type]=[...document.getElementById('edit-'+type).children].map(box=>({owner:box.querySelector('select').value,text:box.querySelector('textarea').value.trim(),when:box.querySelector('input').value.trim()}));if(!validSection(result[type])){error.textContent='请填写每条任务的内容，或删除空白任务。';return}}
try{const edits=JSON.parse(localStorage.getItem(key)||'{}');edits[editing]=result;localStorage.setItem(key,JSON.stringify(edits));}catch{error.textContent='保存失败，浏览器存储不可用。请保留此窗口并复制修改内容。';return}
Object.assign(steps[editing],result);dialog.close();onSave();};
}
