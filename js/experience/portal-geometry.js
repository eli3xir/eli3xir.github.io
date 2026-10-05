// Cover the actual reference box without extending the fully opaque hold.
export function portalGeometry(point,box){
 const x=Math.max(.03,Math.min(.97,point.x)),y=Math.max(.03,Math.min(.97,point.y));
 return{x,y,centerX:box.left+x*box.width,centerY:box.top+y*box.height,
  radius:Math.hypot(Math.max(x,1-x)*box.width,Math.max(y,1-y)*box.height)+2};
}
