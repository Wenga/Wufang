export const cities=[{id:'guangzhou',name:'广州',x:.59,y:.70},{id:'xian',name:'西安',x:.33,y:.46},{id:'nanjing',name:'南京',x:.70,y:.45},{id:'puer',name:'普洱',x:.17,y:.69},{id:'shenyang',name:'沈阳',x:.84,y:.30}];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function random(seed){let s=(seed*4294967295)>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function tasteProfile(tastes){const p={alpha:.48,width:1,speed:1,curve:1,dots:8,dry:.18};for(const t of tastes){if(t==='清'){p.alpha*=.5;p.width*=.65;p.dots-=3;}if(t==='厚'){p.alpha*=1.5;p.width*=2;p.speed*=.78;}if(t==='鲜'){p.dots+=25;p.speed*=1.15;}if(t==='柔'){p.curve*=1.8;p.speed*=.72;p.alpha*=.8;}if(t==='烈'){p.dry+=.45;p.speed*=1.5;p.curve*=.65;p.width*=1.2;}}return p;}
export function createStroke(data){
    const rng=random(data.seed),city=cities.find(c=>c.id===data.city);if(!city)return null;
    const p=tasteProfile(data.tastes),paths=[];
    for(let j=0;j<9;j++){
      const angle=j*.64+rng()*.8,reach=(38+rng()*60)*p.width**.25,points=[];
      for(let i=0;i<=65;i++){const t=i/65,a=angle+Math.sin(t*3.9+j)*.8*p.curve+t*.45;points.push({x:Math.cos(a)*reach*t,y:Math.sin(a)*reach*t*.7,width:(Math.sin(t*Math.PI)**.65+.08)*(3+Math.sin(t*8+j)*1.1)*p.width,rough:rng()});}
      paths.push(points);
    }
    const arrivals=Array.from({length:26},()=>({x:rng()*1000,y:rng()<.5?rng()*90:472+rng()*90,bend:(rng()-.5)*200,delay:rng()*.35}));
    const dots=Array.from({length:Math.max(3,p.dots)},()=>{const a=rng()*6.28,r=10+rng()*70;return{x:Math.cos(a)*r,y:Math.sin(a)*r*.65,r:.4+rng()*2.2,phase:rng()*6.28};});
    return {...data,city,p,paths,arrivals,dots};
}
