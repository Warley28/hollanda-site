/* ==========================================================================
   Capa "opção B" — A Gota
   Desenhada ao vivo em WebGL (um único shader, sem bibliotecas 3D):
   0  capa: uma bolha d'água em 3D com o parque dentro (refração, reflexo de estúdio, balanço)
   →  ao rolar, a onda fecha um tubo em volta da bolha (a visão de quem surfa dentro do tubo) e a
      gente sai por ele: a saída cresce até a foto ocupar a tela inteira
   1–4  uma frase por parada, sobre a foto em tela cheia; a troca de foto é uma onda pintada
      que atravessa a tela
   5  a tela se divide em três faixas (uma foto inteira por empreendimento) com divisórias de água.
   Textos e entradas com Motion (motion.dev); seção fixa e paradas com ScrollTrigger + Lenis.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.querySelector("[data-hero-b]");
  if (!root) return;
  var M = window.Motion;
  var H = window.Hollanda || {};
  var lenis = H.lenis || null;
  var island = H.island || null;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) {
    return (c || root).querySelector(s);
  };
  var $$ = function (s, c) {
    return Array.prototype.slice.call((c || root).querySelectorAll(s));
  };

  var canvas = $("[data-hb-gl]");
  var cover = $("[data-hb-cover]");
  var bar = $("[data-hb-bar]");
  var beats = $$("[data-hb-beat]");
  var end = $("[data-hb-end]");
  var clubs = $$("[data-hb-club]");
  var STOPS = 5; // 0 capa · 1–4 frases · 5 os três empreendimentos

  /* ------------------------------------------------------------------
     WebGL
     ------------------------------------------------------------------ */
  var opts = { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "high-performance", preserveDrawingBuffer: !!window.HERO_B_RECORD };
  var gl = canvas.getContext("webgl2", opts) || canvas.getContext("webgl", opts);
  var gl2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;

  var VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FRAG = [
    "precision highp float;",
    "uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform vec2 uVel;",
    "uniform vec4 uBub;uniform vec3 uRing;uniform float uMode;uniform float uSweep;uniform float uDir;",
    "uniform float uPanels;uniform vec2 uAsp;uniform vec3 uCAsp;uniform vec3 uHov;uniform float uPortrait;",
    "uniform float uWob;uniform float uZoom;uniform float uLens;uniform vec3 uGlow;",
    "uniform sampler2D uA;uniform sampler2D uB;uniform sampler2D uC0;uniform sampler2D uC1;uniform sampler2D uC2;",
    "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
    " return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}",
    "float fbm(vec2 p){return noise(p)*.55+noise(p*2.03+7.1)*.3+noise(p*4.01+3.3)*.15;}",
    // foto "cobrindo" a tela (s em unidades de tela: altura = 2) e "cobrindo" um painel
    "vec2 cover(vec2 s,float ia,float a){float h=max(1.,a/ia);return .5+s/(2.*vec2(h*ia,h));}",
    "vec2 panelUV(vec2 p,vec2 pc,vec2 hs,float ia){float h=max(hs.y,hs.x/ia);return .5+(p-pc)/(2.*vec2(h*ia,h));}",
    // espuma rendada: as bordas finas das células de um Voronoi que se mexe devagar
    "float lace(vec2 p){p+=(vec2(noise(p*.7),noise(p*.7+5.2))-.5)*1.7;vec2 i=floor(p),f=fract(p);float d1=8.,d2=8.;",
    " for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=vec2(hash(i+g),hash(i+g+19.1));",
    "  o=.5+.42*sin(uTime*.7+6.2831*o);float dd=length(g+o-f);if(dd<d1){d2=d1;d1=dd;}else if(dd<d2)d2=dd;}",
    " float wd=.03+.11*noise(p*1.3+3.);",
    " float patch=smoothstep(.22,.62,noise(p*.45+7.));",
    " return max(1.-smoothstep(0.,wd,d2-d1),smoothstep(.64,.86,noise(p*.9+11.))*.85)*patch;}",
    // respingos: gotinhas soltas (uma em algumas células de uma grade)
    "float drops(vec2 p,float dens){vec2 id=floor(p),f=fract(p)-.5;float h=hash(id);",
    " vec2 o=(vec2(hash(id+1.7),hash(id+5.3))-.5)*.6;float rr=.06+.14*hash(id+3.1);",
    " return smoothstep(rr,rr*.4,length(f-o))*step(1.-dens,h);}",
    // o tubo da onda visto de dentro (como o surfista vê): d = posição a partir do centro da saída,
    // R = raio da saída, tw = quanto o tubo já fechou (0–1), spd = velocidade com que atravessamos.
    // A parede gira em espiral e corre para fora; em cima a água é fina e a luz passa (turquesa);
    // longe da saída fica funda e escura; espuma branca na saída e na crista que fecha; respingos no vão.
    "vec4 tube(vec2 d,float R,float tw,float spd){",
    " float r=length(d);vec2 cs=d/max(r,1e-4);float th=atan(d.y,d.x);float t=uTime;",
    " float v=log(max(r,1e-4)/R);",
    " float ph=.5-.5*cs.y;",
    " float T=1.3*(1.-smoothstep(0.,1.,tw*1.3-ph*.3))+.22*(.5+.5*sin(th+tw*5.))*(1.-tw);",
    " float a2=th+v*1.25-t*.4;vec2 q=vec2(cos(a2),sin(a2));",
    " float body=fbm(q*2.3+vec2(v*2.4-t*(.8+spd*3.),0.));",
    " float lip=v-T+(body-.5)*.3;",
    " if(lip<-.45)return vec4(0.);",
    " float lum=smoothstep(-.6,.95,cs.y)*exp(-max(v,0.)*1.05);",
    " vec3 col=mix(vec3(.03,.37,.56),vec3(.008,.07,.2),smoothstep(.1,1.25,v+(body-.5)*.45));",
    " col=mix(col,vec3(.16,.74,.84),lum*.8);col=mix(col,vec3(.72,.95,.98),lum*lum*.4);",
    " float lines=pow(.5+.5*sin(v*12.+th*3.-t*(3.2+spd*9.)+3.*body),8.);",
    " col+=lines*(.14+.5*lum)*vec3(.82,.96,1.);",
    " col+=drops(q*vec2(16.,16.)+vec2(v*34.-t*5.,0.),.05)*1.1*(.25+lum);",
    " col*=1.-.45*smoothstep(.9,1.8,v);",
    " float fz=smoothstep(.2,0.,v+(body-.5)*.2)*smoothstep(-.02,.06,v);",
    " fz=max(fz,smoothstep(.3,0.,lip)*(1.-smoothstep(.85,1.,tw)));",
    " if(fz>.01)col=mix(col,vec3(.94,.985,1.),fz*(.5+.5*lace(d/R*7.+vec2(0.,-t*.6))));",
    " float shut=smoothstep(.55,.95,tw);",
    // o vão que ainda não fechou é a face da onda (água azul-turquesa, não um buraco escuro)
    " col=mix(mix(vec3(.05,.45,.62),vec3(.02,.22,.4),smoothstep(0.,1.2,v)),col,smoothstep(-.05,.05,lip));",
    " float rimF=smoothstep(.14,0.,abs(v-.03)+(body-.5)*.12)*shut;",
    " col=mix(col,vec3(.93,.98,1.),rimF*(.55+.45*lace(d/R*9.+vec2(-t*.4,0.))));",
    " float al=max(smoothstep(-.03,.03,lip),shut*smoothstep(-.06,.0,v));",
    " float sp=drops(d/R*14.+cs*t*1.5,.35)*smoothstep(-.45,-.02,lip)*(1.-al)*(1.-uBub.w);",
    " return vec4(mix(col,vec3(.86,.95,1.),sp),max(al,sp*.9));}",
    // estúdio refletido na bolha: caixa de luz, faixa à esquerda e o pôr do sol à direita
    "vec3 env(vec3 r){vec3 c=mix(vec3(.01,.03,.07),vec3(.05,.12,.24),smoothstep(-.6,.8,r.y));",
    " vec2 b=vec2(r.x+.3,r.y-.42);c+=vec3(1.,1.02,1.05)*smoothstep(.09,0.,max(abs(b.x)-.15,abs(b.y)-.09))*9.;",
    " c+=vec3(.85,.92,1.)*smoothstep(.06,0.,max(abs(r.x+.86)-.04,abs(r.y-.05)-.3))*2.6;",
    " c+=uGlow*smoothstep(.35,.95,r.x)*smoothstep(.6,0.,abs(r.y+.05))*2.2;return c;}",
    // fundo da capa: azul profundo, raios de luz, brilho atrás da bolha e partículas
    "vec3 background(vec2 p){",
    " vec3 c=mix(vec3(.006,.03,.075),vec3(.03,.095,.21),smoothstep(-1.1,1.15,p.y));",
    " float a=atan(p.x+.7,1.9-p.y);c+=vec3(.2,.45,.68)*noise(vec2(a*9.,uTime*.12))*noise(vec2(a*21.,-uTime*.09))*.2*smoothstep(-1.,1.2,p.y);",
    " c+=uGlow*.3*exp(-length(p-uBub.xy-vec2(.1,.06)*uBub.z)/(uBub.z*1.1+.001));",
    " for(int l=0;l<2;l++){float fl=float(l);vec2 q=p*mix(6.,12.,fl)+vec2(0.,uTime*mix(.16,.3,fl))-uMouse*mix(.25,.55,fl);",
    "  vec2 id=floor(q),f=fract(q)-.5;float h=hash(id+fl*7.);vec2 o=vec2(hash(id+1.3),hash(id+2.7))-.5;float r=mix(.09,.05,fl)*(.4+h);",
    "  c+=vec3(.55,.76,.96)*smoothstep(r,r*.35,length(f-o*.6))*step(.74,h)*mix(.11,.07,fl);}",
    " return c;}",
    // escurece onde vai texto: à esquerda no computador, embaixo no celular
    "vec3 scrim(vec3 c,vec2 p,float a){",
    " if(uPortrait>.5){c*=1.-.72*smoothstep(.05,-.9,p.y);c*=1.-.3*smoothstep(.62,1.,p.y);}",
    " else{c*=1.-.8*smoothstep(.35,-.85,p.x/a);c*=1.-.25*smoothstep(-.35,-1.,p.y);c*=1.-.22*smoothstep(.7,1.,p.y);}",
    " return c;}",
    // fechamento: três faixas com divisórias de água
    "vec3 panels(vec2 p,float a){vec3 c;float dl;vec2 m=uMouse*.012;",
    " if(uPortrait<.5){",
    "  float w1=-a/3.+.03*sin(p.y*3.1+uTime*1.1)+.012*sin(p.y*7.3-uTime*1.7);",
    "  float w2=a/3.+.03*sin(p.y*2.7-uTime*.9+1.)+.012*sin(p.y*6.1+uTime*1.4);",
    "  vec3 c0=texture2D(uC0,panelUV(p+m,vec2(-2.*a/3.,0.),vec2(a/3.,1.),uCAsp.x)).rgb;",
    "  vec3 c1=texture2D(uC1,panelUV(p+m,vec2(0.),vec2(a/3.,1.),uCAsp.y)).rgb;",
    "  vec3 c2=texture2D(uC2,panelUV(p+m,vec2(2.*a/3.,0.),vec2(a/3.,1.),uCAsp.z)).rgb;",
    "  float h=p.x<w1?uHov.x:(p.x<w2?uHov.y:uHov.z);c=p.x<w1?c0:(p.x<w2?c1:c2);",
    "  c*=.74+.34*h;c*=1.-.66*smoothstep(-.1,-.95,p.y);c*=1.-.84*smoothstep(.2,.88,p.y);",
    "  dl=min(abs(p.x-w1),abs(p.x-w2));",
    " }else{",
    "  float w1=.2+.025*sin(p.x*4.+uTime*1.1)+.01*sin(p.x*9.-uTime*1.6);",
    "  float w2=-.4+.025*sin(p.x*3.4-uTime*.9+1.)+.01*sin(p.x*8.+uTime*1.3);",
    "  vec3 c0=texture2D(uC0,panelUV(p+m,vec2(0.,.6),vec2(a,.4),uCAsp.x)).rgb;",
    "  vec3 c1=texture2D(uC1,panelUV(p+m,vec2(0.,-.1),vec2(a,.3),uCAsp.y)).rgb;",
    "  vec3 c2=texture2D(uC2,panelUV(p+m,vec2(0.,-.7),vec2(a,.3),uCAsp.z)).rgb;",
    "  float h=p.y>w1?uHov.x:(p.y>w2?uHov.y:uHov.z);c=p.y>w1?c0:(p.y>w2?c1:c2);",
    "  c*=.74+.34*h;c*=1.-.76*smoothstep(.35,-.9,p.x/a);c*=1.-.72*smoothstep(.45,.95,p.y);",
    "  dl=min(abs(p.y-w1),abs(p.y-w2));",
    " }",
    " c=mix(c,vec3(.9,.96,1.),smoothstep(.011,.003,dl));c+=vec3(.3,.6,1.)*.35*exp(-dl*55.);return c;}",
    "void main(){",
    " vec2 fc=gl_FragCoord.xy;float a=uRes.x/uRes.y;vec2 p=(2.*fc-uRes)/uRes.y;float px=2./uRes.y;",
    " vec3 col;",
    " if(uMode<.5){",
    // ---- bolha (e a onda que se enrola em volta dela) ----
    "  col=background(p);",
    "  vec2 c=uBub.xy;float R=max(uBub.z,1e-4);float g=uBub.w;",
    "  vec2 d=p-c;float r=length(d);float th=atan(d.y,d.x);",
    "  float tw=uRing.x;float glass=uRing.y;",
    "  float ang=th;float lean=dot(d/(r+1e-5),uVel)*(1.-g);",
    // quando vira a saída do tubo, a borda deixa de ser um círculo perfeito
    "  float edge=(fbm(vec2(cos(th),sin(th))*2.2+uTime*.25)-.5)*.08*tw*(1.-g);",
    "  float Re=R*(1.+uWob*.018*(.6*sin(ang*3.+uTime*1.3)+.4*sin(ang*2.-uTime*.9+1.))*(1.-g)+.08*lean+edge);",
    "  vec2 q=d/Re;float rq=length(q);",
    "  float inside=1.-smoothstep(1.-1.6*px/Re,1.,rq);",
    "  vec3 n=normalize(vec3(q,-sqrt(max(1.-rq*rq,1e-4))));vec3 rd=vec3(0.,0.,1.);float nv=clamp(-n.z,0.,1.);",
    "  vec2 r1=refract(rd,n,1./1.31).xy,r2=refract(rd,n,1./1.333).xy,r3=refract(rd,n,1./1.36).xy;",
    "  float disp=pow(1.-nv,2.);r1=mix(r2,r1,disp);r3=mix(r2,r3,disp);",
    // dentro: a foto vista pela lente; quando a bolha cresce, a lente some e a foto fica inteira na tela
    "  vec2 m=uMouse*.012*g;vec2 lq=q*1.5*uLens/uZoom;",
    "  vec3 inner=vec3(texture2D(uA,cover(mix(lq+r1*uLens/uZoom,p+m,g),uAsp.x,a)).r,",
    "   texture2D(uA,cover(mix(lq+r2*uLens/uZoom,p+m,g),uAsp.x,a)).g,texture2D(uA,cover(mix(lq+r3*uLens/uZoom,p+m,g),uAsp.x,a)).b);",
    "  vec3 ins=inner*mix(vec3(1.),vec3(.78,.94,1.06),pow(1.-nv,1.5)*glass);",
    "  ins*=mix(1.,.32+.68*smoothstep(0.,.62,nv),glass);",
    "  ins+=vec3(1.,.84,.6)*.38*smoothstep(.42,1.,dot(q,normalize(vec2(.5,-.72))))*smoothstep(.08,.6,nv)*glass;",
    "  float F=(.025+.975*pow(1.-nv,3.))*glass;",
    "  vec3 bub=mix(ins,env(reflect(rd,n)),F);",
    "  vec3 hv=normalize(normalize(vec3(-.55,.65,-.55))-rd);float sp=max(dot(n,hv),0.);",
    "  bub+=(vec3(1.)*(pow(sp,900.)*3.+pow(sp,160.)*.6+pow(sp,24.)*.08)",
    "   +uGlow*pow(max(dot(n,normalize(normalize(vec3(.85,-.15,-.3))-rd)),0.),70.)*.9+uGlow*pow(1.-nv,3.)*smoothstep(-.2,.8,n.x)*.35)*glass;",
    "  bub=mix(bub,scrim(bub,p,a),g);",
    "  col=mix(col,bub,inside);",
    // o tubo da onda em volta (e por cima da borda da bolha)
    "  if(tw>.001){vec4 w=tube(d,Re,tw,uRing.z);col=mix(col,w.rgb,w.a);}",
    " }else{",
    // ---- fotos em tela cheia; a troca é uma onda que atravessa a tela ----
    "  bool tall=uPortrait>.5;float L=tall?1.:a;float Wd=tall?.8:1.;",
    "  float x=(tall?-p.y:p.x)*uDir;float yy=tall?p.x:p.y;vec2 mv=tall?vec2(0.,uDir):vec2(-uDir,0.);",
    "  float front=mix(L+.6,-L-Wd-1.6,uSweep)+.09*sin(yy*2.1+uTime*1.1)+.05*(noise(vec2(yy*2.5,uTime*.4))-.5)+yy*.2;",
    "  float body=fbm(vec2(yy*2.2+uTime*.12,x*1.4-uSweep*3.));",
    "  float v=(x-front)/Wd+(body-.5)*.2;",
    "  float band=smoothstep(-.015,.015,v)*(1.-smoothstep(.96,1.04,v));float w=clamp(v,0.,1.);",
    "  vec2 m=uMouse*.012;",
    // a água empurra a foto da frente e deforma o que está por baixo dela
    "  vec2 wr=(vec2(noise(p*5.+uTime*.6),noise(p*5.+3.-uTime*.6))-.5)*.08*band+mv*(.02+.06*(1.-w))*band;",
    "  vec2 offA=mv*.06*exp(min(v,0.)*6.)*step(v,0.)+wr;",
    "  vec2 offB=mv*.05*exp(-max(v-1.,0.)*5.)*step(1.,v)+wr;",
    "  vec3 cA=scrim(texture2D(uA,cover(p+m+offA,uAsp.x,a)).rgb,p,a);",
    "  vec3 cB=uPanels>.5?panels(p+offB,a):scrim(texture2D(uB,cover(p+m+offB,uAsp.y,a)).rgb,p,a);",
    "  cA*=1.-.3*exp(min(v,0.)*7.)*step(v,0.);", // sombra logo à frente da crista
    // crista de espuma → água turquesa transparente (a foto aparece por baixo) → corpo azul mais fundo
    "  vec3 under=mix(cA,cB,smoothstep(.3,.85,w));",
    "  vec3 wc=mix(vec3(.18,.76,.86),vec3(.03,.37,.56),smoothstep(.04,.45,w));wc=mix(wc,vec3(.02,.2,.42),smoothstep(.45,1.,w));",
    "  float lines=pow(.5+.5*sin(w*30.+body*6.-uSweep*24.),9.);",
    "  vec3 water=mix(wc,under*wc*1.9,mix(.62,.34,smoothstep(.05,.75,w)));",
    "  water+=lines*.24*(1.-w)*vec3(.85,.97,1.)+drops(vec2(yy*1.8,x)*22.+vec2(0.,-uTime*2.),.1)*1.3*(1.-w);",
    "  col=mix(v<.5?cA:cB,water,band);",
    // espuma rendada na crista e a que fica para trás sobre a foto nova, se desfazendo
    "  float crest=smoothstep(.17,0.,w+(body-.5)*.1)*band;",
    "  float trail=step(1.,v)*smoothstep(1.95,1.05,v);",
    "  if(crest+trail>.01){float l=lace(vec2(yy,x)*6.5+vec2(uSweep*2.,0.));",
    "   col=mix(col,vec3(.95,.99,1.),crest*(.65+.35*l));col=mix(col,vec3(.93,.98,1.),trail*l*.4);}",
    "  col=mix(col,vec3(.9,.97,1.),drops(vec2(yy,x)*15.+vec2(0.,uSweep*9.),.3)*smoothstep(-.4,-.02,v)*step(v,0.)*.9);",
    " }",
    " col*=1.-.32*pow(length(p*vec2(.55,.8)),2.4)*.5;",
    " col+=(hash(fc+fract(uTime*7.)*91.)-.5)*.02;",
    " gl_FragColor=vec4(col,1.);}",
  ].join("\n");

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("hero-b shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  var prog = null;
  if (gl) {
    var vs = shader(gl.VERTEX_SHADER, VERT);
    var fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (vs && fs) {
      prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.bindAttribLocation(prog, 0, "a");
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) prog = null;
    }
  }
  if (!prog) {
    // sem WebGL: fica a imagem pronta da bolha
    root.classList.add("hb--nogl");
    gl = null;
  }

  var U = {};
  var textures = {};
  var mobile = window.matchMedia("(max-width: 900px), (max-aspect-ratio: 1/1)").matches;
  var BASE = root.getAttribute("data-hb-path") || "assets/img/gota/";
  // foto de cada parada (a capa começa dentro da bolha); no fim, os três empreendimentos
  var SEQ = ["capa", "capa", "noite", "execucao", "familia"];
  var CLUBS = ["palmeiras", "raposa", "ouro-verde"];
  var ORDER = ["capa", "noite", "execucao", "familia", "palmeiras", "raposa", "ouro-verde"];

  if (gl) {
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    "uRes uTime uMouse uVel uBub uRing uMode uSweep uDir uPanels uAsp uCAsp uHov uPortrait uWob uZoom uLens uGlow uA uB uC0 uC1 uC2"
      .split(" ")
      .forEach(function (k) {
        U[k] = gl.getUniformLocation(prog, k);
      });
    ["uA", "uB", "uC0", "uC1", "uC2"].forEach(function (k, i) {
      gl.uniform1i(U[k], i);
    });
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  }

  // textura começa com um pixel azul-marinho e recebe a foto quando ela chega
  function texture(name) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); // (o Firefox avisa se inverter um pixel solto)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([8, 30, 66]));
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textures[name] = { tex: t, aspect: mobile ? 0.75 : 16 / 9 };
    return textures[name];
  }
  function tex(name) {
    return textures[name] || texture(name);
  }
  function load(name) {
    return new Promise(function (resolve) {
      var rec = tex(name);
      var img = new Image();
      img.decoding = "async";
      img.src = BASE + name + (mobile ? "-m" : "") + ".webp";
      var put = function () {
        gl.bindTexture(gl.TEXTURE_2D, rec.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        var pot = (img.width & (img.width - 1)) === 0 && (img.height & (img.height - 1)) === 0;
        if (gl2 || pot) {
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        }
        rec.aspect = img.width / img.height;
        resolve();
      };
      img.onload = function () {
        (img.decode ? img.decode() : Promise.resolve()).then(put, put);
      };
      img.onerror = function () {
        resolve();
      };
    });
  }

  /* ------------------------------------------------------------------
     Estado
     ------------------------------------------------------------------ */
  var W = 1,
    Hh = 1,
    aspect = 1,
    dpr = 1,
    scale = 1;
  var P = 0; // posição na história: 0 capa … 5 empreendimentos
  var Ptarget = 0;
  var appear = { v: reduced ? 1 : 0 }; // a bolha se condensa na entrada
  var mouse = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0 };
  var wob = { kick: 0, vel: 0 };
  var bub = { x: 0, y: 0, vx: 0, vy: 0, init: false };
  var hov = [0.6, 0.6, 0.6];
  var hovTarget = -1;

  function smooth(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function inOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // a bolha na capa: à direita do texto no computador, em cima no celular
  function bubbleHome() {
    if (aspect >= 1) return [aspect * 0.42, 0.02, Math.min(0.6, aspect * 0.36)];
    return [0, 0.43, Math.min(0.37, aspect * 0.8)];
  }

  function targets() {
    var k = Math.min(STOPS - 1, Math.floor(P));
    var f = P - k;
    var e = smooth(0.15, 0.85, f);
    if (P >= STOPS) {
      k = STOPS - 1;
      e = 1;
    }
    return { k: k, e: e };
  }

  /* ------------------------------------------------------------------
     Desenho
     ------------------------------------------------------------------ */
  var GLOW = [0.92, 0.5, 0.12];
  var t0 = performance.now();
  var last = t0;
  var frames = 0,
    slowSum = 0,
    slowRuns = 0;
  var visible = true;
  var running = false;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width);
    Hh = Math.max(1, rect.height);
    aspect = W / Hh;
    // na gravação do vídeo, resolução cheia (a tela é ampliada 2× e reduzida depois: bordas lisas)
    var base = window.HERO_B_RECORD ? window.devicePixelRatio || 1 : Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    dpr = base * scale;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(Hh * dpr);
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    bub.init = false;
  }

  function step(now) {
    running = false;
    if (!visible) return;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // ajusta a resolução se a máquina não aguentar 50 quadros/s (ignora os primeiros segundos,
    // quando as fotos ainda estão chegando, e só reduz depois de duas medições lentas seguidas)
    if (now - t0 > 3000) {
      frames++;
      slowSum += dt;
      if (frames === 45) {
        slowRuns = slowSum / frames > 0.021 ? slowRuns + 1 : 0;
        if (slowRuns >= 2 && scale > 0.62) {
          scale *= 0.85;
          slowRuns = 0;
          resize();
        }
        frames = 0;
        slowSum = 0;
      }
    }

    P += (Ptarget - P) * Math.min(1, dt * 9);
    if (Math.abs(Ptarget - P) < 0.0005) P = Ptarget;
    var T = targets();
    var k = T.k,
      e = T.e;

    // ponteiro: posição suave e velocidade (deforma a bolha)
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 6);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 6);
    var vx = (mouse.tx - mouse.x) * 1.2,
      vy = (mouse.ty - mouse.y) * 1.2;
    mouse.vx += (Math.max(-1, Math.min(1, vx)) - mouse.vx) * Math.min(1, dt * 5);
    mouse.vy += (Math.max(-1, Math.min(1, vy)) - mouse.vy) * Math.min(1, dt * 5);

    // a bolha segue o mouse de leve com uma mola que sobra um pouco, como água
    var home = bubbleHome();
    var hx = home[0] + mouse.x * 0.035,
      hy = home[1] + mouse.y * 0.035;
    if (!bub.init) {
      bub.x = hx;
      bub.y = hy;
      bub.init = true;
    }
    bub.vx += ((hx - bub.x) * 70 - bub.vx * 11) * dt;
    bub.vy += ((hy - bub.y) * 70 - bub.vy * 11) * dt;
    bub.x += bub.vx * dt;
    bub.y += bub.vy * dt;

    // balanço: base + o "tranco" quando a foto troca ou a bolha é tocada
    wob.vel += (-wob.kick * 60 - wob.vel * 7) * dt;
    wob.kick += wob.vel * dt;
    var wobble = reduced ? 0 : 1 + Math.abs(wob.kick) * 5 + Math.hypot(mouse.vx, mouse.vy) * 2;

    // destaque da faixa sob o mouse no fechamento
    for (var i = 0; i < 3; i++) {
      var ht = hovTarget < 0 ? 0.6 : hovTarget === i ? 1 : 0.35;
      hov[i] += (ht - hov[i]) * Math.min(1, dt * 8);
    }

    if (gl) {
      var time = reduced ? 2.0 : (now - t0) / 1000;
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, time);
      gl.uniform2f(U.uMouse, mouse.x, mouse.y);
      gl.uniform2f(U.uVel, mouse.vx, mouse.vy);
      gl.uniform1f(U.uWob, wobble);
      gl.uniform1f(U.uPortrait, aspect < 1 ? 1 : 0);
      gl.uniform1f(U.uLens, aspect < 1 ? 0.8 : 1);
      gl.uniform3f(U.uGlow, GLOW[0], GLOW[1], GLOW[2]);
      gl.uniform3f(U.uHov, hov[0], hov[1], hov[2]);
      bind(2, CLUBS[0]);
      bind(3, CLUBS[1]);
      bind(4, CLUBS[2]);
      gl.uniform3f(U.uCAsp, tex(CLUBS[0]).aspect, tex(CLUBS[1]).aspect, tex(CLUBS[2]).aspect);

      if (k === 0) {
        // capa → a onda se enrola em volta da bolha → a bolha cresce até virar o fundo
        // 1ª metade: a onda fecha o tubo em volta da bolha; 2ª metade: a gente sai pelo tubo
        // (a saída cresce até a foto ocupar a tela, e a parede de água corre para fora)
        var R0 = home[2] * appear.v;
        var tw = smooth(0.02, 0.46, e);
        var grow = inOut(smooth(0.46, 1, e));
        var cx = lerp(bub.x, 0, grow),
          cy = lerp(bub.y, 0, grow);
        var Rmax = (Math.hypot(aspect, 1) + Math.hypot(cx, cy)) * 1.7;
        var R = lerp(R0, Rmax, grow);
        gl.uniform1f(U.uMode, 0);
        gl.uniform4f(U.uBub, cx, cy, R, smooth(0.52, 1, e));
        gl.uniform3f(U.uRing, tw, 1 - smooth(0.24, 0.55, e), 4 * grow * (1 - grow));
        gl.uniform1f(U.uZoom, 1);
        bind(0, SEQ[0]);
        bind(1, SEQ[0]);
        gl.uniform2f(U.uAsp, tex(SEQ[0]).aspect, tex(SEQ[0]).aspect);
      } else {
        // foto em tela cheia; a próxima entra com uma onda (alternando o sentido)
        var a = SEQ[k],
          b = k < STOPS - 1 ? SEQ[k + 1] : null;
        gl.uniform1f(U.uMode, 1);
        gl.uniform1f(U.uSweep, e);
        gl.uniform1f(U.uDir, k % 2 ? 1 : -1);
        gl.uniform1f(U.uPanels, b ? 0 : 1);
        bind(0, a);
        bind(1, b || a);
        gl.uniform2f(U.uAsp, tex(a).aspect, tex(b || a).aspect);
        gl.uniform4f(U.uBub, 0, 0, 0, 1);
        gl.uniform3f(U.uRing, 0, 0, 0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    texts();
    if (!reduced) queue();
  }
  function bind(unit, name) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex(name).tex);
  }
  function queue() {
    if (!running && visible && !recording) {
      running = true;
      requestAnimationFrame(step);
    }
  }

  /* ------------------------------------------------------------------
     Textos (Motion): capa some com a rolagem; frases e fechamento entram por parada
     ------------------------------------------------------------------ */
  var active = -1;
  var SPRING = { type: "spring", bounce: 0.18, duration: 0.9 };
  function show(el, on) {
    if (!el) return;
    el._on = on;
    // para o que estiver animando (uma saída rápida não pode apagar o texto que acabou de entrar)
    if (el._anim) el._anim.stop();
    if (!M) {
      el.style.opacity = on ? 1 : 0;
      el.style.visibility = on ? "visible" : "hidden";
      return;
    }
    if (on) {
      el.style.visibility = "visible";
      el.style.opacity = 1;
      el._anim = null;
      var parts = $$("[data-hb-part]", el);
      // começam invisíveis: senão as partes com atraso (stagger) aparecem inteiras por um instante,
      // somem e só então entram
      parts.forEach(function (p) {
        p.style.opacity = 0;
      });
      M.animate(parts,{ opacity: [0, 1], y: [36, 0], filter: ["blur(10px)", "blur(0px)"] }, Object.assign({ delay: M.stagger(0.07) }, SPRING));
    } else {
      el._anim = M.animate(el, { opacity: 0 }, { duration: 0.28, ease: "easeIn" });
      el._anim.then(function () {
        if (!el._on) el.style.visibility = "hidden";
      });
    }
  }
  var islandChap = -2;
  function texts() {
    // capa: sobe e desfoca conforme a rolagem
    var c = smooth(0.04, 0.3, P);
    if (cover) {
      cover.style.opacity = String(1 - c);
      cover.style.transform = "translate3d(0," + -c * 60 + "px,0)";
      cover.style.filter = c > 0.01 ? "blur(" + c * 8 + "px)" : "";
      cover.style.visibility = c > 0.99 ? "hidden" : "visible";
    }
    if (bar) bar.style.opacity = String(1 - smooth(0.02, 0.18, P));
    var near = Math.round(P);
    var j = Math.abs(P - near) < 0.32 ? near : -1;
    if (j === 0) j = -1;
    if (j !== active) {
      if (active >= 1 && active <= 4) show(beats[active - 1], false);
      if (active === 5) show(end, false);
      active = j;
      if (j >= 1 && j <= 4) show(beats[j - 1], true);
      if (j === 5) show(end, true);
    }
    var chap = P > 0.6 ? Math.max(0, Math.min(4, Math.round(P) - 1)) : -1;
    if (island && chap !== islandChap) {
      islandChap = chap;
      island.heroState(chap >= 0, chap);
    }
  }

  /* ------------------------------------------------------------------
     Ponteiro: a bolha segue de leve, inclina com a velocidade e balança ao toque
     ------------------------------------------------------------------ */
  function toView(e) {
    var r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width - 0.5) * 2 * aspect, y: -((e.clientY - r.top) / r.height - 0.5) * 2 };
  }
  root.addEventListener("pointermove", function (e) {
    var v = toView(e);
    mouse.tx = v.x;
    mouse.ty = v.y;
    queue();
  });
  root.addEventListener("pointerleave", function () {
    mouse.tx = 0;
    mouse.ty = 0;
  });
  root.addEventListener("pointerdown", function (e) {
    var v = toView(e);
    var home = bubbleHome();
    if (P < 0.2 && Math.hypot(v.x - bub.x, v.y - bub.y) < home[2]) wob.vel += 2.4;
  });
  clubs.forEach(function (el, i) {
    el.addEventListener("pointerenter", function () {
      hovTarget = i;
    });
    el.addEventListener("pointerleave", function () {
      if (hovTarget === i) hovTarget = -1;
    });
    el.addEventListener("focus", function () {
      hovTarget = i;
    });
    el.addEventListener("blur", function () {
      if (hovTarget === i) hovTarget = -1;
    });
  });

  /* ------------------------------------------------------------------
     Rolagem: seção fixa, posição 0–5 e encaixe nas paradas
     ------------------------------------------------------------------ */
  var trig = null;
  if (!reduced && window.ScrollTrigger) {
    trig = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "+=" + STOPS * 105 + "%",
      pin: true,
      // criada depois das outras seções (este arquivo roda após o app.js), mas fica no topo da página
      refreshPriority: 1,
      onUpdate: function (self) {
        Ptarget = self.progress * STOPS;
        queue();
      },
    });
    ScrollTrigger.refresh();
    var yOf = function (stop) {
      return trig.start + (stop / STOPS) * (trig.end - trig.start);
    };
    if (island) {
      island.heroGoto = function (i) {
        var y = yOf(i + 1);
        if (lenis) lenis.scrollTo(y, { duration: 1.4 });
        else window.scrollTo({ top: y, behavior: "smooth" });
      };
    }
    $$("[data-hb-next]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        if (lenis) lenis.scrollTo(yOf(1), { duration: 1.8 });
        else window.scrollTo({ top: yOf(1), behavior: "smooth" });
      });
    });
    // se a rolagem parar entre duas paradas, desliza até a próxima no sentido em que a pessoa ia
    if (lenis) {
      var idle = null,
        snapping = false,
        dir = 1;
      var settle = function () {
        var y = lenis.scroll;
        if (snapping || y <= trig.start + 1 || y >= trig.end - 1) return;
        var x = ((y - trig.start) / (trig.end - trig.start)) * STOPS;
        var f = x - Math.floor(x);
        if (f < 0.12 || f > 0.88) return;
        var target = dir > 0 ? Math.ceil(x) : Math.floor(x);
        var ty = yOf(target);
        var dur = Math.min(1.6, Math.max(0.8, (Math.abs(ty - y) / window.innerHeight) * 1.1));
        snapping = true;
        var done = function () {
          snapping = false;
        };
        lenis.scrollTo(ty, {
          duration: dur,
          easing: function (k) {
            return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          },
          onComplete: done,
        });
        setTimeout(done, dur * 1000 + 400);
      };
      lenis.on("scroll", function () {
        if (!snapping && lenis.direction) dir = lenis.direction;
        clearTimeout(idle);
        idle = setTimeout(settle, 180);
      });
    }
  }

  // só desenha com a capa na tela e a aba visível
  function checkVisible() {
    var r = root.getBoundingClientRect();
    var on = !document.hidden && r.bottom > 0 && r.top < window.innerHeight;
    if (on && !visible) {
      visible = true;
      last = performance.now();
      queue();
    }
    visible = on;
  }
  window.addEventListener("scroll", checkVisible, { passive: true });
  document.addEventListener("visibilitychange", checkVisible);
  window.addEventListener("resize", function () {
    resize();
    if (trig) ScrollTrigger.refresh();
    queue();
  });

  /* ------------------------------------------------------------------
     Entrada: a bolha se condensa (mola com sobra) e o título sobe palavra por palavra
     ------------------------------------------------------------------ */
  var entered = false;
  function enter() {
    if (entered) return;
    entered = true;
    if (!M || reduced) {
      appear.v = 1;
      $$(".hw > span", cover).forEach(function (s) {
        s.style.transform = "";
      });
      $$("[data-hb-intro]").forEach(function (s) {
        s.style.opacity = "";
      });
      queue();
      return;
    }
    M.animate(appear, { v: [0, 1] }, { type: "spring", bounce: 0.42, duration: 1.6, delay: 0.15 });
    wob.vel += 3;
    M.animate($$(".hw > span", cover), { y: ["110%", "0%"] }, { type: "spring", bounce: 0.2, duration: 1.1, delay: M.stagger(0.06, { startDelay: 0.25 }) });
    M.animate($$("[data-hb-intro]"), { opacity: [0, 1], y: [24, 0], filter: ["blur(8px)", "blur(0px)"] }, { type: "spring", bounce: 0.15, duration: 1, delay: M.stagger(0.08, { startDelay: 0.55 }) });
  }

  resize();
  // a capa primeiro (a bolha só se forma com a foto dentro); o resto em seguida, na ordem da história
  var capaReady = gl ? load("capa") : Promise.resolve();
  capaReady.then(function () {
    queue();
    if (gl)
      ORDER.slice(1).reduce(function (p, n) {
        return p.then(function () {
          return load(n);
        });
      }, Promise.resolve());
  });
  var enterWhenReady = function () {
    Promise.race([
      capaReady,
      new Promise(function (r) {
        setTimeout(r, 2500);
      }),
    ]).then(enter);
  };
  if (!reduced) {
    $$(".hw > span", cover).forEach(function (s) {
      s.style.transform = "translateY(110%)";
    });
    $$("[data-hb-intro]").forEach(function (s) {
      s.style.opacity = 0;
    });
  }
  if (H.introStarted) enterWhenReady();
  else document.addEventListener("hollanda:intro", enterWhenReady);
  // garantia: se o aviso da entrada não vier (sem GSAP), entra mesmo assim
  setTimeout(enter, 5000);
  queue();

  /* ------------------------------------------------------------------
     Gravação do vídeo de apresentação (tools/gravar_video.mjs): desenha quadro a quadro, com o
     tempo e a posição da história dados de fora — sem rolagem e sem depender do relógio
     ------------------------------------------------------------------ */
  var recording = false;
  window.HeroB = {
    ready: function () {
      return Promise.all(ORDER.map(function (n) {
        return gl ? load(n) : null;
      }));
    },
    // t: segundos do vídeo · p: posição na história (0 capa … 5 empreendimentos) · ap: bolha 0–1
    // mx/my: "mouse" (move a bolha e a profundidade de leve, como uma câmera) · kick: balanço extra
    frame: function (o) {
      recording = true;
      visible = true;
      t0 = 0;
      last = o.t * 1000 - 1000 / 60;
      Ptarget = P = o.p;
      appear.v = o.ap === undefined ? 1 : o.ap;
      mouse.tx = o.mx || 0;
      mouse.ty = o.my || 0;
      if (o.kick) wob.vel += o.kick;
      step(o.t * 1000);
      gl.finish();
    },
  };
})();
