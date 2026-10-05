// Runs inside the browser. Compare a real HDR scene-buffer resolve against
// independent 16 x 16 subpixel triangle coverage, before tone mapping or grain.
export async function rasterCoverage(){
  const T=await import('three'),w=window.studio.world,r=w.renderer,c=w.composer,aa=w.antialiasing;
  w.stop();const saved=r.getRenderTarget(),scene=new T.Scene();scene.background=new T.Color(0);
  const camera=new T.OrthographicCamera(0,aa.sceneTarget.width,aa.sceneTarget.height,0,.1,10);camera.position.z=5;
  const vertices=[[8.25,12.375],[116.45,27.825],[39.125,114.3]],geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices.flatMap(p=>[...p,0]),3));
  const material=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});scene.add(new T.Mesh(geometry,material));
  const size=128,reference=new Float32Array(size*size),data=new Uint16Array(size*size*4),cases=[];
  const inside=(x,y)=>vertices.every((a,i)=>{const b=vertices[(i+1)%3];return (b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0])>=0;});
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let count=0;for(let j=0;j<16;j++)for(let i=0;i<16;i++)if(inside(x+(i+.5)/16,y+(j+.5)/16))count++;
    reference[y*size+x]=count/256;
  }
  for(const mode of ['baseline','fxaa','auto','high']){
    aa.apply(mode==='baseline'||mode==='fxaa'?'low':mode,innerWidth<700);
    r.setRenderTarget(aa.sceneTarget);r.clear();r.render(scene,camera);
    const actualSamples=r.getContext().getParameter(r.getContext().SAMPLES);
    r.setRenderTarget(null);let target=aa.sceneTarget;
    if(mode==='fxaa'){aa.pass.renderToScreen=false;aa.pass.render(r,c.writeBuffer,aa.sceneTarget,0);target=c.writeBuffer;r.setRenderTarget(null);}
    r.readRenderTargetPixels(target,0,0,size,size,data);
    let squared=0,partial=0,interior=0,nonfinite=0;
    for(let i=0;i<reference.length;i++){
      const value=T.DataUtils.fromHalfFloat(data[i*4]);if(!Number.isFinite(value))nonfinite++;
      squared+=(value-reference[i])**2;if(value>.001&&value<.999)partial++;if(value>.99)interior++;
    }
    cases.push({mode,actualSamples,mse:squared/reference.length,partial,interior,nonfinite});
  }
  geometry.dispose();material.dispose();r.setRenderTarget(saved);w.applyQuality();w.moving=1;w.start();return cases;
}
