import {cities,createStroke} from './brush.js';

// Stable seed-based impressions: reconstruction and export do not depend on frame rate.
export class Artwork {
  constructor(){this.records=[];this.ids=new Set();this.cache=null;this.height=null;this.dirty=true;}
  set(records){this.records=records;this.ids=new Set(records.map(r=>r.id));this.dirty=true;}
  draw(ctx,height=.5){
    if(!this.cache){this.cache=document.createElement('canvas');this.cache.width=2000;this.cache.height=1125;}
    if(this.dirty||height!==this.height){
      this.height=height;this.dirty=false;
      const c=this.cache.getContext('2d');c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,1000,562.5);
      c.save();c.beginPath();c.rect(0,(1-height)*281.25,1000,height*562.5);c.clip();
      for(const record of this.records){
        const s=createStroke(record);if(!s)continue;
        c.save();c.translate(s.city.x*1000,((1-height)/2+(s.city.y-.25)*height/.5)*562.5);
        // Individual marks remain pale; the whole layer has a fixed opacity ceiling.
        for(const path of s.paths){
          for(let i=1;i<path.length;i++){
            const a=path[i-1],b=path[i];
            c.lineCap='round';c.lineWidth=b.width*2.6;c.strokeStyle=`rgba(23,23,23,${s.p.alpha*.028})`;
            c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
            if(b.rough>s.p.dry){c.lineWidth=Math.max(.35,b.width*.65);c.strokeStyle=`rgba(23,23,23,${s.p.alpha*.13})`;c.stroke();}
          }
        }
        for(const d of s.dots){c.fillStyle=`rgba(23,23,23,${s.p.alpha*.12})`;c.beginPath();c.ellipse(d.x,d.y,d.r*s.p.width,d.r*.65,d.phase,0,Math.PI*2);c.fill();}
        c.restore();
      }
      c.restore();
    }
    ctx.save();ctx.globalAlpha=.52;ctx.drawImage(this.cache,0,0,1000,562.5);ctx.restore();
  }
}

export async function exportArtwork(manifest){
  const canvas=document.createElement('canvas');canvas.width=3200;canvas.height=1800;
  const c=canvas.getContext('2d'),settings=manifest.settings;
  c.scale(3.2,3.2);c.fillStyle='#f3eee3';c.fillRect(0,0,1000,562.5);
  if(settings.landscape){
    const image=new Image();image.src='/landscape.png';await image.decode();
    const scale=Math.max(1000/image.naturalWidth,562.5/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    c.save();c.globalAlpha=.08;c.globalCompositeOperation='multiply';c.filter='grayscale(1) blur(7px) contrast(0.7) brightness(1.15)';c.drawImage(image,(1000-w)/2,(562.5-h)/2,w,h);c.restore();
  }
  const artwork=new Artwork();artwork.set(manifest.records);artwork.draw(c,settings.height);
  await document.fonts.ready;
  for(const city of cities){
    const x=city.x*1000,y=((1-settings.height)/2+(city.y-.25)*settings.height/.5)*562.5;
    c.fillStyle='#20251e';c.beginPath();c.arc(x,y,3.7,0,Math.PI*2);c.fill();
    c.font=`${settings.fontSize}px "Kaiti SC", "STKaiti", "KaiTi", serif`;c.textAlign='center';c.textBaseline='top';c.fillText(city.name,x,y+12);
  }
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('图片生成失败')),'image/png'));
}
