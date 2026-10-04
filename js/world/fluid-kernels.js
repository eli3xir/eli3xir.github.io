export const fluidVertex='varying vec2 cell;void main(){cell=uv;gl_Position=vec4(position.xy,0.,1.);}';
const common=`precision highp float;varying vec2 cell;uniform sampler2D source,velocity,auxiliary;uniform vec2 pixel,sourcePixel;uniform float dt,fade;
 vec4 bilinear(sampler2D field,vec2 uv,vec2 texel){vec2 p=uv/texel-.5,i=floor(p),f=fract(p),a=(i+.5)*texel;return mix(mix(texture2D(field,a),texture2D(field,a+vec2(texel.x,0.)),f.x),mix(texture2D(field,a+vec2(0.,texel.y)),texture2D(field,a+texel),f.x),f.y);}
 vec2 flow(vec2 uv){vec2 v=texture2D(source,clamp(uv,pixel*.5,1.-pixel*.5)).xy;if(uv.x<0.||uv.x>1.)v.x=-v.x;if(uv.y<0.||uv.y>1.)v.y=-v.y;return v;}
 vec2 wall(vec2 v){if(cell.x<pixel.x||cell.x>1.-pixel.x)v.x=0.;if(cell.y<pixel.y||cell.y>1.-pixel.y)v.y=0.;return v;}
`;
export const fluidKernels={
 copy:common+'void main(){gl_FragColor=texture2D(source,cell)*fade;}',
 advect:common+`void main(){vec2 v=bilinear(velocity,cell,pixel).xy;vec2 uv=clamp(cell-dt*v/vec2(1.6,1.),sourcePixel*.5,1.-sourcePixel*.5);gl_FragColor=bilinear(source,uv,sourcePixel)*fade;}`,
 divergence:common+`void main(){vec2 d=pixel;float div=(flow(cell+vec2(d.x,0.)).x-flow(cell-vec2(d.x,0.)).x+flow(cell+vec2(0.,d.y)).y-flow(cell-vec2(0.,d.y)).y)*.5/d.y;gl_FragColor=vec4(div,0,0,1);}`,
 pressure:common+`void main(){float p=texture2D(source,cell+vec2(pixel.x,0.)).x+texture2D(source,cell-vec2(pixel.x,0.)).x+texture2D(source,cell+vec2(0.,pixel.y)).x+texture2D(source,cell-vec2(0.,pixel.y)).x;gl_FragColor=vec4((p-texture2D(auxiliary,cell).x*pixel.y*pixel.y)*.25,0,0,1);}`,
 project:common+`void main(){vec2 gradient=vec2(texture2D(auxiliary,cell+vec2(pixel.x,0.)).x-texture2D(auxiliary,cell-vec2(pixel.x,0.)).x,texture2D(auxiliary,cell+vec2(0.,pixel.y)).x-texture2D(auxiliary,cell-vec2(0.,pixel.y)).x)*.5/pixel.y;gl_FragColor=vec4(wall(texture2D(source,cell).xy-gradient),0,1);}`,
 curl:common+`void main(){float curl=(flow(cell+vec2(pixel.x,0.)).y-flow(cell-vec2(pixel.x,0.)).y-flow(cell+vec2(0.,pixel.y)).x+flow(cell-vec2(0.,pixel.y)).x)*.5/pixel.y;gl_FragColor=vec4(curl,0,0,1);}`,
 confinement:common+`void main(){vec2 n=vec2(abs(texture2D(auxiliary,cell+vec2(pixel.x,0.)).x)-abs(texture2D(auxiliary,cell-vec2(pixel.x,0.)).x),abs(texture2D(auxiliary,cell+vec2(0.,pixel.y)).x)-abs(texture2D(auxiliary,cell-vec2(0.,pixel.y)).x));n/=length(n)+.0001;vec2 force=vec2(n.y,-n.x)*texture2D(auxiliary,cell).x*pixel.y*1.1;gl_FragColor=vec4(wall(clamp(texture2D(source,cell).xy+force*dt,vec2(-2.),vec2(2.))),0,1);}`,
 correct:common+`void main(){vec2 v=bilinear(velocity,cell,pixel).xy/vec2(1.6,1.);vec2 back=clamp(cell-dt*v,sourcePixel*.5,1.-sourcePixel*.5),forward=clamp(cell+dt*v,sourcePixel*.5,1.-sourcePixel*.5);vec4 corrected=texture2D(auxiliary,cell)+.5*(texture2D(source,cell)-bilinear(auxiliary,forward,sourcePixel));
  vec2 corner=(floor(back/sourcePixel-.5)+.5)*sourcePixel;vec4 a=texture2D(source,corner),b=texture2D(source,corner+vec2(sourcePixel.x,0.)),c=texture2D(source,corner+vec2(0.,sourcePixel.y)),d=texture2D(source,corner+sourcePixel);gl_FragColor=clamp(corrected,min(min(a,b),min(c,d)),max(max(a,b),max(c,d)))*fade;}`,
 splat:common+`uniform vec2 center,impulse;uniform vec3 ink;uniform float radius,amount,isVelocity;
 void main(){vec2 p=(cell-center)*vec2(1.6,1.);float w=exp(-dot(p,p)/(radius*radius));vec4 base=texture2D(source,cell);gl_FragColor=isVelocity>.5?vec4(wall(clamp(base.xy+impulse*w,vec2(-2.),vec2(2.))),0,1):min(vec4(12.),base+vec4(ink,1.)*w*amount);}`
};
