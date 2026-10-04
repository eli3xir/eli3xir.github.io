// Earliest contact between a moving circle and a static axis-aligned rectangle.
// Face intervals and corner quadratics avoid the false square corners of an expanded AABB.
export function sweepCircleRect(x,y,vx,vy,r,box,maxTime){
 let best=null;
 const take=(t,nx,ny)=>{if(t>=-1e-9&&t<=maxTime+1e-9&&vx*nx+vy*ny< -1e-9&&(!best||t<best.time))best={time:Math.max(0,t),nx,ny};};
 for(const side of [-1,1]){
  if(Math.abs(vx)>1e-12){const t=(box.x+side*(box.w/2+r)-x)/vx,at=y+vy*t;if(at>=box.y-box.h/2-1e-9&&at<=box.y+box.h/2+1e-9)take(t,side,0);}
  if(Math.abs(vy)>1e-12){const t=(box.y+side*(box.h/2+r)-y)/vy,at=x+vx*t;if(at>=box.x-box.w/2-1e-9&&at<=box.x+box.w/2+1e-9)take(t,0,side);}
 }
 const a=vx*vx+vy*vy;if(a<1e-16)return best;
 for(const sx of [-1,1])for(const sy of [-1,1]){
  const cx=box.x+sx*box.w/2,cy=box.y+sy*box.h/2,dx=x-cx,dy=y-cy,b=2*(dx*vx+dy*vy),c=dx*dx+dy*dy-r*r,d=b*b-4*a*c;if(d<0)continue;
  const t=(-b-Math.sqrt(d))/(2*a),px=dx+vx*t,py=dy+vy*t;if(px*sx>=-1e-9&&py*sy>=-1e-9)take(t,px/r,py/r);
 }
 return best;
}
