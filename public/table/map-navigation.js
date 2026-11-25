const W=640,H=600,MAX=4;
export function constrain(view){const k=Math.max(1,Math.min(MAX,view.k));return {k,x:Math.max(W*(1-k),Math.min(0,view.x)),y:Math.max(H*(1-k),Math.min(0,view.y))};}
export function zoomAt(view,factor,point){const k=Math.max(1,Math.min(MAX,view.k*factor));return constrain({k,x:point.x-(point.x-view.x)*k/view.k,y:point.y-(point.y-view.y)*k/view.k});}
export function initMapNavigation(svg,positions){
 const land=svg.querySelector('#map-land'),markers=[...svg.querySelectorAll('.marker')];
 const plus=document.querySelector('#map-plus'),minus=document.querySelector('#map-minus'),reset=document.querySelector('#map-reset');
 let view={k:1,x:0,y:0},points=new Map(),baseline=null,suppressClick=false;
 const point=e=>{const m=svg.getScreenCTM();return new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse());};
 function paint(){view=constrain(view);land.setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.k})`);markers.forEach((m,i)=>m.setAttribute('transform',`translate(${view.x+positions[i][0]*view.k} ${view.y+positions[i][1]*view.k})`));plus.disabled=view.k>=MAX;minus.disabled=view.k<=1;svg.classList.toggle('is-zoomed',view.k>1);}
 function rebase(){const p=[...points.values()];baseline=p.length?{view:{...view},points:p.map(v=>({...v}))}:null;}
 svg.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;if(!points.size)suppressClick=false;points.set(e.pointerId,{x:point(e).x,y:point(e).y,clientX:e.clientX,clientY:e.clientY});if(points.size>1)suppressClick=true;rebase();});
 svg.addEventListener('pointermove',e=>{if(!points.has(e.pointerId)||!baseline)return;const p=point(e);points.set(e.pointerId,{x:p.x,y:p.y,clientX:e.clientX,clientY:e.clientY});const current=[...points.values()],start=baseline.points;
 if(current.length===1&&start.length===1){if(Math.hypot(current[0].clientX-start[0].clientX,current[0].clientY-start[0].clientY)<6&&!suppressClick)return;suppressClick=true;view=constrain({...baseline.view,x:baseline.view.x+current[0].x-start[0].x,y:baseline.view.y+current[0].y-start[0].y});}
 else if(current.length>=2&&start.length>=2){suppressClick=true;const a={x:(start[0].x+start[1].x)/2,y:(start[0].y+start[1].y)/2},b={x:(current[0].x+current[1].x)/2,y:(current[0].y+current[1].y)/2};const ratio=Math.hypot(current[1].x-current[0].x,current[1].y-current[0].y)/Math.max(1,Math.hypot(start[1].x-start[0].x,start[1].y-start[0].y));const k=Math.max(1,Math.min(MAX,baseline.view.k*ratio));view=constrain({k,x:b.x-(a.x-baseline.view.x)*k/baseline.view.k,y:b.y-(a.y-baseline.view.y)*k/baseline.view.k});}
 if(suppressClick){svg.setPointerCapture(e.pointerId);svg.classList.add('is-dragging');e.preventDefault();paint();}
 });
 const end=e=>{if(!points.has(e.pointerId))return;points.delete(e.pointerId);if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);rebase();if(!points.size)svg.classList.remove('is-dragging');};
 window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);svg.addEventListener('lostpointercapture',e=>{if(e.target===svg)end(e);});
 svg.addEventListener('click',e=>{if(suppressClick&&e.detail!==0){e.preventDefault();e.stopImmediatePropagation();}},true);
 // Safari's legacy gesture events must not zoom the document inside this surface.
 for(const name of ['gesturestart','gesturechange','gestureend'])svg.addEventListener(name,e=>e.preventDefault(),{passive:false});
 plus.addEventListener('click',()=>{view=zoomAt(view,1.35,{x:W/2,y:H/2});paint();});minus.addEventListener('click',()=>{view=zoomAt(view,1/1.35,{x:W/2,y:H/2});paint();});reset.addEventListener('click',()=>{points.clear();baseline=null;view={k:1,x:0,y:0};svg.classList.remove('is-dragging');paint();});paint();
}
