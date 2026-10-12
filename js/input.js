// ============================================================
//  input.js — Commandes : joystick tactile, boutons A/B/C/Esquive/Relève, clavier. Actions press/rel/dash/swap.
// ============================================================
const joy=document.getElementById('joy'),knob=document.getElementById('knob');
function jmove(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;if(innerHeight>innerWidth){const q=dx;dx=dy;dy=-q}dx/=UIK.menu;dy/=UIK.menu;const m=Math.hypot(dx,dy),L=45;if(m>L){dx*=L/m;dy*=L/m}jx=dx/L;jy=dy/L;knob.style.transform=`translate(${dx}px,${dy}px)`}
joy.addEventListener('pointerdown',e=>{joy.setPointerCapture(e.pointerId);jmove(e)});
joy.addEventListener('pointermove',e=>{if(joy.hasPointerCapture(e.pointerId))jmove(e)});
const jend=()=>{jx=jy=0;knob.style.transform=''};
joy.addEventListener('pointerup',jend);
joy.addEventListener('pointercancel',jend);
const bt=[0,1,2,3].map(i=>document.getElementById('b'+i));
[0,1,2].forEach(i=>{const b=bt[i];
  b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);AIM.start(i,b);press(i)});
  b.addEventListener('pointermove',e=>{if(b.hasPointerCapture(e.pointerId))AIM.move(i,e)});   // glisser = viser
  b.addEventListener('pointerup',()=>rel(i));b.addEventListener('pointercancel',()=>{AIM.stop(i);rel(i)})});
bt[3].addEventListener('pointerdown',()=>dash());
addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT')return;const c=canon(e.code);if(!c)return;if(c==='Space'||c.startsWith('Arrow'))e.preventDefault();if(keys[c])return;keys[c]=1;const i={KeyJ:0,KeyK:1,KeyL:2}[c];if(i!=null){AIM.key(i);press(i)}if(c=='Space')dash()});
addEventListener('keyup',e=>{const c=canon(e.code);if(!c)return;keys[c]=0;const i={KeyJ:0,KeyK:1,KeyL:2}[c];if(i!=null)rel(i)});
function press(i){if(!G||G.over||G.p.cd[i]>0)return;down[i]=1}
function rel(i){if(!G||!down[i])return;down[i]=0;const p=G.p,m=p.mv[i],c=p.ch[i]>.15?p.ch[i]:0;p.ch[i]=0;fire(m,c,i);p.cd[i]=p.cm[i]=m.cd*(1+c*.4)}
function dash(){if(!G||G.over||G.p.dC>0)return;const p=G.p;let dx=jx+kx,dy=jy+ky;const m=Math.hypot(dx,dy);if(m<.1){dx=0;dy=1}else{dx/=m;dy/=m}p.dx=dx;p.dy=dy;p.dT=.2;p.dC=1.3;p.inv=.25}
bt[4]=document.getElementById('b4');
function setBtns(){G.p.mv.forEach((m,i)=>bt[i].innerHTML=`<b>${'ABC'[i]} ${m.n}</b><small>${TN[m.tp||G.p.t]||''}</small><i></i><em></em>`)}
function doSwap(n){const o=G.p;n.x=o.x;n.y=o.y;n.inv=1;n.dT=0;n.ch=[0,0,0];down[0]=down[1]=down[2]=0;G.p=n;G.swc=3;setBtns();fx.push({x:n.x,y:n.y,t:.5,mx:.5})}
function swap(){if(!G||G.over||G.swc>0)return;const i=G.team.indexOf(G.p);for(let k=1;k<G.team.length;k++){const c=G.team[(i+k)%G.team.length];if(c.hp>0){doSwap(c);return}}}
bt[4].addEventListener('pointerdown',swap);
addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT')return;if(canon(e.code)=='KeyQ')swap()});
