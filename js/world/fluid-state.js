export const FLUID_ASPECT=1.6,VELOCITY_WIDTH=128,VELOCITY_HEIGHT=80,DYE_WIDTH=512,DYE_HEIGHT=320;
export const PIGMENTS=[{name:'紫藤',hex:'#9675bd'},{name:'薄荷',hex:'#31aa96'},{name:'珊瑚',hex:'#e66f82'},{name:'湖蓝',hex:'#5295c4'},{name:'麦金',hex:'#d8a94c'}];
export function pigment(index){const hex=PIGMENTS[((index%5)+5)%5].hex;return[1,3,5].map(i=>-Math.log(Math.max(.012,(parseInt(hex.slice(i,i+2),16)/255)**2.2))*.58);}
export function initialFluid(width,height,velocity=false){
 const data=new Float32Array(width*height*4),colors=[pigment(1),pigment(2),pigment(4)];
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const x=(i+.5)/width,y=(j+.5)/height,k=(j*width+i)*4;
  if(velocity){
   for(const [cx,cy,spin,size] of [[.39,.48,1,.29],[.73,.67,-1,.16],[.72,.23,1,.15]]){const ox=(x-cx)*FLUID_ASPECT,oy=y-cy,w=Math.exp(-(ox*ox+oy*oy)/(size*size))*spin*.8;data[k]-=oy*w;data[k+1]+=ox*w;}
   const fade=Math.min(1,Math.min(x,1-x,y,1-y)*15);data[k]*=fade;data[k+1]*=fade;
  }else{
   const edge=Math.min(1,Math.min(x,1-x,y,1-y)*18);
   for(let c=0;c<3;c++){
    const center=.29+c*.12+.15*Math.sin(y*5.6+c*.8)+.045*Math.sin(y*18+c),width=c===2?.025:.065;
    const band=Math.exp(-(((x-center)/width)**2)-(((y-(.55-c*.045))/.33)**6))*edge*(c===2?2:2.8);
    for(let n=0;n<3;n++)data[k+n]+=colors[c][n]*band;data[k+3]+=band;
   }
  }
 }return data;
}
export function resampleField(source,fromWidth,fromHeight,width,height){
 if(fromWidth===width&&fromHeight===height)return source.slice();const out=new Float32Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sx=Math.max(0,Math.min(fromWidth-1,(x+.5)/width*fromWidth-.5)),sy=Math.max(0,Math.min(fromHeight-1,(y+.5)/height*fromHeight-.5)),ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
  for(let c=0;c<4;c++){const at=(dx,dy)=>source[(Math.min(fromHeight-1,iy+dy)*fromWidth+Math.min(fromWidth-1,ix+dx))*4+c];out[(y*width+x)*4+c]=(at(0,0)*(1-fx)+at(1,0)*fx)*(1-fy)+(at(0,1)*(1-fx)+at(1,1)*fx)*fy;}
 }return out;
}
export function validFluidState(state){return state&&Number.isInteger(state.width)&&state.width>0&&state.width<=DYE_WIDTH&&Number.isInteger(state.height)&&state.height>0&&state.height<=DYE_HEIGHT&&state.dye instanceof Float32Array&&state.dye.length===state.width*state.height*4&&state.velocity instanceof Float32Array&&state.velocity.length===VELOCITY_WIDTH*VELOCITY_HEIGHT*4&&state.pressure instanceof Float32Array&&state.pressure.length===state.velocity.length&&state.velocity.every(Number.isFinite)&&state.pressure.every(Number.isFinite)&&state.dye.every(Number.isFinite);}
