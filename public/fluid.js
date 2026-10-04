// Original local ink-advection implementation. See README for visual references.
// A bounded tile holds velocity and pigment; pressure relaxation keeps flow coherent.
export class WetInk {
  constructor(n=112) {
    this.n=n;this.size=n*n;this.time=0;this.dirty=true;
    for(const name of ['u','v','u2','v2','d','d2','pressure','div'])this[name]=new Float32Array(this.size);
  }
  sample(a,x,y){
    const n=this.n;x=Math.max(1,Math.min(n-2.001,x));y=Math.max(1,Math.min(n-2.001,y));
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,k=iy*n+ix;
    return (a[k]*(1-fx)+a[k+1]*fx)*(1-fy)+(a[k+n]*(1-fx)+a[k+n+1]*fx)*fy;
  }
  splat(x,y,radius,amount,vx=0,vy=0){
    this.dirty=true;const n=this.n,cx=n/2+x*n/280,cy=n/2+y*n/280,r=Math.max(.8,radius*n/280);
    for(let j=Math.max(1,Math.floor(cy-r*3));j<Math.min(n-1,cy+r*3);j++)for(let i=Math.max(1,Math.floor(cx-r*3));i<Math.min(n-1,cx+r*3);i++){
      const g=Math.exp(-((i-cx)**2+(j-cy)**2)/(2*r*r)),k=j*n+i;
      this.d[k]=Math.min(4,this.d[k]+g*amount);
      this.u[k]=Math.max(-25,Math.min(25,this.u[k]+g*vx));this.v[k]=Math.max(-25,Math.min(25,this.v[k]+g*vy));
    }
  }
  step(dt=1/30,decay=.65,motion=1){
    this.dirty=true;dt=Math.min(dt,.04);this.time+=dt;const n=this.n;
    // Semi-Lagrangian velocity transport, plus a gentle divergence-free curl field.
    for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
      const k=y*n+x,bx=x-this.u[k]*dt,by=y-this.v[k]*dt;
      const phase=this.time*.23;
      this.u2[k]=this.sample(this.u,bx,by)*.985+Math.sin(x*.12+phase)*Math.cos(y*.12-phase)*dt*.9*motion;
      this.v2[k]=this.sample(this.v,bx,by)*.985-Math.cos(x*.12+phase)*Math.sin(y*.12-phase)*dt*.9*motion;
    }
    [this.u,this.u2]=[this.u2,this.u];[this.v,this.v2]=[this.v2,this.v];this.pressure.fill(0);
    for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){const k=y*n+x;this.div[k]=-.5*(this.u[k+1]-this.u[k-1]+this.v[k+n]-this.v[k-n]);}
    for(let iteration=0;iteration<8;iteration++)for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){const k=y*n+x;this.pressure[k]=(this.div[k]+this.pressure[k-1]+this.pressure[k+1]+this.pressure[k-n]+this.pressure[k+n])*.25;}
    for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){const k=y*n+x;this.u[k]-=.5*(this.pressure[k+1]-this.pressure[k-1]);this.v[k]-=.5*(this.pressure[k+n]-this.pressure[k-n]);}
    const fade=Math.exp(-dt*decay);
    for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
      const k=y*n+x,bx=x-this.u[k]*dt*motion,by=y-this.v[k]*dt*motion;
      const ink=this.sample(this.d,bx,by),bleed=(this.d[k-1]+this.d[k+1]+this.d[k-n]+this.d[k+n])*.25;
      this.d2[k]=Math.max(0,(ink*.993+bleed*.007)*fade);
    }
    [this.d,this.d2]=[this.d2,this.d];
  }
  paint(){
    if(this.canvas&&!this.dirty)return this.canvas;this.dirty=false;
    if(!this.canvas){this.canvas=document.createElement('canvas');this.canvas.width=this.canvas.height=this.n;this.ctx=this.canvas.getContext('2d');this.pixels=this.ctx.createImageData(this.n,this.n);}
    const pixels=this.pixels.data,n=this.n;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const k=y*n+x,edge=Math.min(1,Math.min(x,y,n-1-x,n-1-y)/8),a=(1-Math.exp(-this.d[k]*1.4))*edge;
      pixels[k*4]=pixels[k*4+1]=pixels[k*4+2]=23;pixels[k*4+3]=Math.round(a*210);
    }
    this.ctx.putImageData(this.pixels,0,0);return this.canvas;
  }
}
