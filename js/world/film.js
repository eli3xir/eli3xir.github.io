export const FilmShader = {
  uniforms: { tDiffuse:{value:null}, uTime:{value:0}, uTransition:{value:0}, uWarm:{value:.15} },
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime,uTransition,uWarm;varying vec2 vUv;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){vec2 uv=vUv;vec2 d=uv-.5;
      float radius=length(d);float wave=sin(radius*38.-uTransition*12.)*uTransition*.011;
      uv+=normalize(d+vec2(.0001))*wave;
      vec3 c=texture2D(tDiffuse,uv).rgb;
      float vignette=1.-smoothstep(.24,.78,radius)*.42;
      c*=vignette;c.r+=uWarm*.015;c.b-=uWarm*.009;
      c+=(hash(gl_FragCoord.xy+floor(uTime*24.))-.5)*.009;
      gl_FragColor=vec4(c,1.);}`,
};
