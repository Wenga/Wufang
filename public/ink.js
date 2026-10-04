import {WetInk} from './fluid.js';
export const cities=[{id:'guangzhou',name:'广州',x:.59,y:.70},{id:'xian',name:'西安',x:.33,y:.46},{id:'nanjing',name:'南京',x:.70,y:.45},{id:'puer',name:'普洱',x:.17,y:.69},{id:'shenyang',name:'沈阳',x:.84,y:.30}];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function random(seed){let s=(seed*4294967295)>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function tasteProfile(tastes){const p={alpha:.48,width:1,speed:1,curve:1,dots:8,dry:.18};for(const t of tastes){if(t==='清'){p.alpha*=.5;p.width*=.65;p.dots-=3;}if(t==='厚'){p.alpha*=1.5;p.width*=2;p.speed*=.78;}if(t==='鲜'){p.dots+=25;p.speed*=1.15;}if(t==='柔'){p.curve*=1.8;p.speed*=.72;p.alpha*=.8;}if(t==='烈'){p.dry+=.45;p.speed*=1.5;p.curve*=.65;p.width*=1.2;}}return p;}
export class Ink {
  constructor(canvas,onStage=()=>{}){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.paper=true;this.continuousRipple=null;this.cityFontSize=25;this.particleScale=1;this.height=.5;this.strokes=[];this.onStage=onStage;this.stage='';this.last=performance.now();this.clock=0;this.nextAmbient=8;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.landscapeEnabled=true;this.landscape=new Image();this.landscape.src='/landscape.png';
    const r=random(.318);this.particles=Array.from({length:90},()=>({x:r(),y:r(),vx:(r()-.5)*.013,vy:(r()-.5)*.014,r:.6+r()*1.2,phase:r()*6.28}));
    this.fibers=Array.from({length:650},()=>({x:r(),y:r(),length:1+r()*5,a:.012+r()*.02}));
    this.resize=new ResizeObserver(()=>this.size());this.resize.observe(canvas);this.size();this.tick=this.tick.bind(this);this.raf=requestAnimationFrame(this.tick);
  }
  size(){const rect=this.canvas.getBoundingClientRect();this.w=rect.width;this.h=rect.height;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=this.w*this.dpr;this.canvas.height=this.h*this.dpr;}
  target(city){return {x:city.x*1000,y:((1-this.height)/2+(city.y-.25)*this.height/.5)*562.5};}
  add(data,ambient=false){
    if(this.strokes.some(s=>s.id===data.id))return;
    const rng=random(data.seed),city=cities.find(c=>c.id===data.city);if(!city)return;
    const p=tasteProfile(data.tastes),paths=[];
    for(let j=0;j<9;j++){
      const angle=j*.64+rng()*.8,reach=(38+rng()*60)*p.width**.25,points=[];
      for(let i=0;i<=65;i++){const t=i/65,a=angle+Math.sin(t*3.9+j)*.8*p.curve+t*.45;points.push({x:Math.cos(a)*reach*t,y:Math.sin(a)*reach*t*.7,width:(Math.sin(t*Math.PI)**.65+.08)*(3+Math.sin(t*8+j)*1.1)*p.width,rough:rng()});}
      paths.push(points);
    }
    const arrivals=Array.from({length:26},()=>({x:rng()*1000,y:rng()<.5?rng()*90:472+rng()*90,bend:(rng()-.5)*200,delay:rng()*.35}));
    const dots=Array.from({length:Math.max(3,p.dots)},()=>{const a=rng()*6.28,r=10+rng()*70;return{x:Math.cos(a)*r,y:Math.sin(a)*r*.65,r:.4+rng()*2.2,phase:rng()*6.28};});
    this.strokes.push({id:data.id,city,p,paths,arrivals,dots,ambient,wet:new WetInk(),wetTime:0,wetAccumulator:0,start:performance.now()-Math.min(6000,Math.max(0,Date.now()-(data.start||Date.now())))});
    if(this.strokes.length>50)this.strokes.shift();
  }
  setRippleCity(cityId){
    const city=cities.find(c=>c.id===cityId);
    this.continuousRipple=city?{city,seed:Math.random(),start:performance.now(),wet:new WetInk(),wetTime:0,wetAccumulator:0}:null;
  }
  updateWet(s,t,dt,ripple=false){
    if(!s.wet||(!ripple&&t>6))return;
    s.wetAccumulator+=Math.min(dt,.05);
    while(s.wetAccumulator>=1/30){
      s.wetAccumulator-=1/30;s.wetTime+=1/30;
      if(ripple){
        const phase=s.seed*6.28,cycle=s.wetTime%3.8;
        // A breathing impulse fans unevenly outwards; tangential force curls its rim.
        if(cycle<1.6){
          const radius=8+cycle*36;
          for(let i=0;i<32;i++){
            const angle=i/32*Math.PI*2,warp=1+.16*Math.sin(angle*3+phase)+.09*Math.cos(angle*7-phase);
            const strength=(.6+.4*Math.sin(angle*4+phase)**2)*Math.sin(Math.PI*cycle/1.6);
            s.wet.splat(Math.cos(angle)*radius*warp,Math.sin(angle)*radius*.7*warp,3.2,.038*strength,
              (Math.cos(angle)*1.8-Math.sin(angle)*.65)*strength,(Math.sin(angle)*1.2+Math.cos(angle)*.65)*strength);
          }
        }
        s.wet.step(1/30,.60,this.reduced?0:1);
      }else{
        const p=s.p,growth=clamp((t-1.6)/2.6*p.speed);
        if(t>1.6&&t<4.7&&growth<1){
          for(let j=0;j<s.paths.length;j++){
            const path=s.paths[j],idx=Math.min(path.length-1,Math.floor(growth*(path.length-1))),point=path[idx],prev=path[Math.max(0,idx-1)];
            const turn=p.curve*.7;
            s.wet.splat(point.x,point.y,Math.max(2,point.width*(p.dry>.4?.75:1.3)),p.alpha*.095*(s.ambient?.5:1),
              (point.x-prev.x)*p.speed*.9-point.y*.006*turn,(point.y-prev.y)*p.speed*.9+point.x*.006*turn);
          }
        }
        s.wet.step(1/30,t>4.5?1.3:.28,this.reduced?0:p.speed);
      }
    }
  }
  drawRipple(r,t){
    const c=this.ctx,center=this.target(r.city);c.save();this.paperPath(c);c.clip();
    c.globalAlpha=.9;c.drawImage(r.wet.paint(),center.x-231,center.y-231,462,462);
    c.restore();
  }
  paperPath(c){const top=(1-this.height)/2*562.5,bottom=top+this.height*562.5;c.beginPath();c.moveTo(0,top);for(let x=0;x<=1000;x+=10)c.lineTo(x,top+Math.sin(x*.12)*1.1+Math.sin(x*.43)*.7);c.lineTo(1000,bottom);for(let x=1000;x>=0;x-=10)c.lineTo(x,bottom+Math.sin(x*.15)*1.1+Math.cos(x*.38)*.7);c.closePath();}
  tick(now){
    const dt=Math.min((now-this.last)/1000,.04);this.last=now;this.clock+=dt;const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.w,this.h);c.scale(this.w/1000,this.h/562.5);
    if(this.paper){this.paperPath(c);c.fillStyle='#f3eee3';c.fill();c.save();this.paperPath(c);c.clip();for(const f of this.fibers){c.strokeStyle=`rgba(106,91,63,${f.a})`;c.lineWidth=.5;c.beginPath();c.moveTo(f.x*1000,f.y*562.5);c.lineTo(f.x*1000+f.length,f.y*562.5+.6);c.stroke();}c.restore();}
    if(this.landscapeEnabled&&this.landscape.complete&&this.landscape.naturalWidth){
      const image=this.landscape,scale=Math.max(1000/image.naturalWidth,562.5/image.naturalHeight);
      const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
      c.save();c.globalAlpha=.08;c.globalCompositeOperation='multiply';
      c.filter='grayscale(1) blur(7px) contrast(0.7) brightness(1.15)';
      c.drawImage(image,(1000-width)/2,(562.5-height)/2,width,height);c.restore();
    }
    const active=this.strokes.findLast(s=>!s.ambient&&now-s.start<6000),elapsed=active?(now-active.start)/1000:99;
    const label=elapsed<.4?'墨粒暂驻，感受抵达':elapsed<2.2?'四方聚墨，汇入宣纸':elapsed<4.7?`${active.city.name} · ${active.p?active.label||'味觉成笔':''}`:elapsed<6?'余韵留痕，缓缓归静':'墨粒游离，静候一笔';
    if(label!==this.stage){this.stage=label;this.onStage(label);}
    for(const p of this.particles){if(elapsed>.4&&!this.reduced){p.x=(p.x+p.vx*dt+1)%1;p.y=(p.y+p.vy*dt+1)%1;}const inside=p.y>(1-this.height)/2&&p.y<(1+this.height)/2;c.fillStyle=inside?'rgba(35,38,30,.10)':'rgba(25,28,23,.65)';c.beginPath();c.ellipse(p.x*1000,p.y*562.5,p.r*this.particleScale*(inside?2:1),p.r*this.particleScale*(inside?.6:1),inside?Math.sin(this.clock+p.phase):0,0,6.28);c.fill();}
    if(this.clock>this.nextAmbient&&!active&&!this.reduced){this.nextAmbient=this.clock+12+Math.random()*7;this.add({id:`ambient-${now}`,seed:Math.random(),city:cities[Math.floor(Math.random()*5)].id,tastes:['清','柔']},true);}
    this.strokes=this.strokes.filter(s=>now-s.start<180000);
    for(const s of this.strokes){const age=(now-s.start)/1000;this.updateWet(s,age,dt);this.drawStroke(s,age);}
    if(this.continuousRipple){this.updateWet(this.continuousRipple,0,dt,true);this.drawRipple(this.continuousRipple,(now-this.continuousRipple.start)/1000);}
    for(const city of cities){const p=this.target(city);c.fillStyle='#20251e';c.beginPath();c.arc(p.x,p.y,3.7,0,6.28);c.fill();c.font=`${this.cityFontSize}px "Kaiti SC", "STKaiti", "KaiTi", serif`;c.textAlign='center';c.textBaseline='top';c.fillText(city.name,p.x,p.y+12);}
    this.raf=requestAnimationFrame(this.tick);
  }
  drawStroke(s,t){
    const c=this.ctx,target=this.target(s.city),p=s.p;const age=t>4.6? .10+.90*Math.exp(-(t-4.6)*2):1;const residue=t>6?Math.exp(-(t-6)/42)*clamp((180-t)/30):1;
    const alpha=Math.min(.85,p.alpha)*age*residue*(s.ambient?.17:1);const growth=clamp((t-1.75)/2.5*p.speed);
    if(t<2.65&&!s.ambient&&!this.reduced){
      const top=(1-this.height)/2*562.5,bottom=(1+this.height)/2*562.5;
      for(const a of s.arrivals){const u=clamp((t-.4-a.delay)/1.7),ease=u*u*(3-2*u);if(u<=0||u>=1)continue;
        const point=v=>({x:a.x+(target.x-a.x)*v+Math.sin(v*Math.PI)*a.bend,y:a.y+(target.y-a.y)*v});
        for(let j=0;j<19;j++){const v=Math.max(0,ease-j*.009),v2=Math.max(0,v-.01),q=point(v),r=point(v2),inside=q.y>=top&&q.y<=bottom;c.strokeStyle=`rgba(26,29,23,${(1-j/20)*(inside?.28:.13)})`;c.lineWidth=inside?1.4+Math.sin(j*2+a.bend)*.8:.65;c.beginPath();c.moveTo(r.x,r.y);c.lineTo(q.x+(inside?Math.sin(j*5)*1.1:0),q.y);c.stroke();}
        const q=point(ease);c.fillStyle='rgba(25,28,23,.7)';c.beginPath();c.arc(q.x,q.y,1.7*this.particleScale,0,6.28);c.fill();
      }
    }
    if(growth<=0)return;
    c.save();this.paperPath(c);c.clip();c.translate(target.x,target.y);
    const size=s.ambient?.45:1;c.scale(size,size);
    // Wet pigment keeps advecting after the bristles have passed.
    c.globalAlpha=(s.ambient?.24:.85)*(t>6?Math.exp(-(t-6)/35):1);
    c.drawImage(s.wet.paint(),-140,-140,280,280);c.globalAlpha=1;
    // Dry bristle traces retain the calligraphic structure under the moving wash.
    for(const path of s.paths){const count=Math.floor(growth*(path.length-1));
      for(let pass=0;pass<5;pass++){
        for(let i=1;i<=count;i++){const drift=this.reduced?0:Math.sin(Math.min(t,6)*.8+i*.06)*Math.min(t,4)*.45;const a={...path[i-1],x:path[i-1].x+drift},b={...path[i],x:path[i].x+drift};if(pass>1&&b.rough<p.dry)continue;const taper=1-i/path.length;
          c.lineCap=pass===0?'round':'butt';c.lineWidth=pass===0?b.width*3:pass===1?b.width:.35+b.width*.1;
          c.strokeStyle=`rgba(23,23,23,${alpha*(pass===0?.045:pass===1?.16:.28)*(taper*.5+.5)})`;
          const offset=(pass-2)*b.width*.3;c.beginPath();c.moveTo(a.x+offset,a.y+offset*.4);c.lineTo(b.x+offset,b.y+offset*.4);c.stroke();
        }
      }
    }
    for(let i=0;i<Math.floor(s.dots.length*growth);i++){const d=s.dots[i],jitter=t<4.6&&p.dots>15?Math.sin(t*7+d.phase)*2:0;c.fillStyle=`rgba(23,23,23,${alpha*.7})`;c.beginPath();c.ellipse(d.x+jitter,d.y,d.r*p.width,d.r*.65, d.phase,0,6.28);c.fill();}
    c.restore();
  }
}
