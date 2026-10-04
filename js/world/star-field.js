import * as THREE from 'three';
import {starSeeds,rotateStar,meteorProgress} from './star-exposure.js';
export function createStarField(count=900){
 const root=new THREE.Group(),stars=starSeeds(count),data=new Float32Array(count*4),colors=new Float32Array(count*4),warm=new THREE.Color('#edc58e'),cool=new THREE.Color('#adcde5');
 stars.forEach((s,i)=>{data.set([s.r,s.z,s.angle,s.brightness],i*4);const c=s.warm?warm:cool;colors.set([c.r,c.g,c.b,s.size],i*4);});
 const uniforms={start:{value:0},sweep:{value:0},orientation:{value:new THREE.Matrix3()},viewport:{value:new THREE.Vector2(1000,1000)},radius:{value:1.42}};
 const common=`attribute vec4 aSeed,aTint;uniform float start,sweep,radius;uniform mat3 orientation;uniform vec2 viewport;varying vec3 shade;varying float alpha,front,edge;
 vec3 point(float angle){return orientation*vec3(aSeed.x*cos(angle),aSeed.x*sin(angle),aSeed.y)*radius;}
 `;
 const fragment=`varying vec3 shade;varying float alpha,front,edge;void main(){float opacity=alpha*smoothstep(0.,.13,front)*pow(max(0.,1.-abs(edge)),.6);if(opacity<.005)discard;gl_FragColor=vec4(shade,opacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
 const steps=80,positions=[],indices=[];for(let i=0;i<=steps;i++){positions.push(i/steps,-1,0,i/steps,1,0);if(i<steps){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}
 const geometry=new THREE.InstancedBufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.setAttribute('aSeed',new THREE.InstancedBufferAttribute(data,4));geometry.setAttribute('aTint',new THREE.InstancedBufferAttribute(colors,4));geometry.instanceCount=count;
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:common+`void main(){float angle=start+aSeed.z+sweep*position.x;vec3 p=point(angle);vec4 mv=modelViewMatrix*vec4(p,1.),clip=projectionMatrix*mv;vec4 next=projectionMatrix*modelViewMatrix*vec4(point(angle+.002),1.);float aspect=viewport.x/viewport.y;
   vec2 tangent=normalize((next.xy/next.w-clip.xy/clip.w)*vec2(aspect,1.)+vec2(.0000001,0.));vec2 normal=vec2(-tangent.y,tangent.x)/vec2(aspect,1.);float raw=.0012*aTint.w*length(modelViewMatrix[0].xyz)*viewport.y*projectionMatrix[1][1]/max(.1,-mv.z),width=clamp(raw,.45,1.2);
   clip.xy+=normal*position.y*width*2./viewport.y*clip.w;gl_Position=clip;shade=aTint.rgb*(.6+aSeed.w*.7);alpha=(.22+aSeed.w*.45)*min(1.,raw/.45)*smoothstep(0.,.008,sweep);front=p.z/radius;edge=position.y;}`,fragmentShader:fragment.replace('float opacity=alpha','float opacity=alpha*pow(max(0.,front),1.5)')});
 const trails=new THREE.Mesh(geometry,material);trails.frustumCulled=false;trails.name='exposure-arcs';root.add(trails);
 const pointGeometry=new THREE.BufferGeometry();pointGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));pointGeometry.setAttribute('aSeed',new THREE.BufferAttribute(data,4));pointGeometry.setAttribute('aTint',new THREE.BufferAttribute(colors,4));
 const pointMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:common+`void main(){vec3 p=point(start+aSeed.z+sweep);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float raw=.006*aTint.w*length(modelViewMatrix[0].xyz)*viewport.y*projectionMatrix[1][1]/max(.1,-mv.z);gl_PointSize=clamp(raw,1.,6.);shade=aTint.rgb*(.9+aSeed.w*1.3);alpha=(.4+aSeed.w*.6)*min(1.,raw*raw);front=p.z/radius;edge=0.;}`,
  fragmentShader:fragment.replace('abs(edge)','length(gl_PointCoord-.5)*2.')});
 const points=new THREE.Points(pointGeometry,pointMaterial);points.frustumCulled=false;points.name='exposure-stars';root.add(points);
 for(const item of [trails,points]){item.geometry.boundingBox=new THREE.Box3(new THREE.Vector3(-1.42,-1.42,-1.42),new THREE.Vector3(1.42,1.42,1.42));item.geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1.42);item.onBeforeRender=renderer=>renderer.getDrawingBufferSize(uniforms.viewport.value);}
 const meteorPoints=[];for(let i=0;i<=24;i++){const x=-.88+i/24*1.4,y=.9-i/24*.42;meteorPoints.push(new THREE.Vector3(x,y,Math.sqrt(1.43**2-x*x-y*y)));}
 const meteor=new THREE.Line(new THREE.BufferGeometry().setFromPoints(meteorPoints),new THREE.LineBasicMaterial({color:0xe8d8b4,transparent:true,opacity:.4,depthWrite:false}));meteor.visible=false;root.add(meteor);
 const axes=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],matrix=new THREE.Matrix4();
 return{root,stars,trails,points,meteor,uniforms,update(state){uniforms.start.value=state.start;uniforms.sweep.value=state.angle;for(let i=0;i<3;i++){const basis={r:i===2?0:1,z:i===2?1:0,angle:i===1?Math.PI/2:0};axes[i].fromArray(rotateStar(basis,0,state.pole));}matrix.makeBasis(...axes);uniforms.orientation.value.setFromMatrix4(matrix);const m=meteorProgress(state);meteor.visible=m>0;meteor.geometry.setDrawRange(0,Math.floor(m*24)+1);meteor.quaternion.setFromRotationMatrix(matrix);},sample(i,t,state){return rotateStar(stars[i],state.start+state.angle*t,state.pole);}};
}
