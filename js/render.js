// ============================================================
//  render.js — Affichage : menu, HUD (barres de vie, pastilles), dessin d'une image du jeu, boucle principale.
// ============================================================
function menu(h){const m=document.getElementById('menu');m.innerHTML=h?'<div class="mc">'+h+'</div>':'';m.style.display=h?'flex':'none'}
function hud(){const p=G.p,e=G.e,HW=VW/UIK.hud;
 const side=(m,right,hp,max,title,boss)=>{const px=right?HW-40:4;ctx.fillStyle=shade(COL[m.t],-.3);ctx.fillRect(px,4,36,36);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(px,4,36,36);ctx.drawImage(spr(m.t,boss),px+2,6,32,32);
  const bw=190,bx=right?HW-44-bw:44,al=right?'right':'left';otext(title,right?HW-48:48,16,15,'#fff',al);
  ctx.font='bold 9px "Courier New",monospace';ctx.textAlign='center';let cx0=right?bx+bw:bx;typesOf(m.t).forEach(tp=>{const n=(TN[tp]||tp).toUpperCase(),cw=n.length*6+8;if(right)cx0-=cw;ctx.fillStyle=COL[tp]||'#888';ctx.fillRect(cx0,19,cw,11);ctx.fillStyle='#fff';ctx.fillText(n,cx0+cw/2,28);cx0+=right?-3:cw+3});
  ctx.fillStyle='#14101c';ctx.fillRect(bx,32,bw,12);const f=Math.max(0,hp/max)*(bw-2);ctx.fillStyle=hp/max<.25?'#d9503f':hp/max<.5?'#e3b72a':'#4fd16a';ctx.fillRect(right?bx+bw-1-f:bx+1,33,f,10);
  otext(String(Math.max(0,Math.ceil(hp*10))),right?bx+bw-4:bx+4,42,11,'#fff',al)};
 side(p,0,p.hp,p.max,NAME[p.t]);side(e,1,e.hp,e.max,(e.boss?'BOSS ':'')+NAME[e.t],e.boss);
 const pip=(cx,cy,st)=>{ctx.fillStyle=st==2?'#666':'#e23b3b';ctx.beginPath();ctx.arc(cx,cy,6,Math.PI,6.283);ctx.fill();ctx.fillStyle=st==2?'#999':'#fff';ctx.beginPath();ctx.arc(cx,cy,6,0,Math.PI);ctx.fill();ctx.strokeStyle='#14101c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,6,0,6.283);ctx.moveTo(cx-6,cy);ctx.lineTo(cx+6,cy);ctx.stroke();if(st==1){ctx.strokeStyle='#ffd23f';ctx.beginPath();ctx.arc(cx,cy,9,0,6.283);ctx.stroke()}};
 for(let i=0;i<G.team.length;i++)pip(54+i*18,58,G.team[i].hp<=0?2:G.team[i]==p?1:0);for(let i=0;i<G.et.length;i++)pip(HW-54-i*18,58,i<G.wave?2:i==G.wave?1:0);
 const s=Math.floor(G.time),tm=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');ctx.fillStyle='#14101ccc';ctx.fillRect(HW/2-30,48,60,22);otext(tm,HW/2,64,15,'#fff','center');
 [0,1].forEach(i=>{const l=lb[i];if(!l||l.ttl<=0)return;ctx.font='italic 900 14px "Courier New",monospace';const s=l.s+'!',w=ctx.measureText(s).width+20,x=i?HW-w-4:4;ctx.globalAlpha=Math.min(1,l.ttl*3);ctx.fillStyle='#fff';ctx.fillRect(x,80,w,22);ctx.strokeStyle=COL[l.t];ctx.lineWidth=3;ctx.strokeRect(x,80,w,22);ctx.fillStyle='#14101c';ctx.textAlign='center';ctx.fillText(s,x+w/2,96);ctx.globalAlpha=1})}
function draw(){ctx.save();if(G.shake>0){const m=Math.min(14,G.shake*34);ctx.translate((Math.random()-.5)*m*Settings.get().shake,(Math.random()-.5)*m*Settings.get().shake)}applyZoom();const p=G.p,e=G.e;updCam(p,e);ctx.save();ctx.translate(-Math.round(CAM.x),-Math.round(CAM.y));ctx.drawImage(bg,0,0);ctx.drawImage(TR,0,0);
 const sp=(s,x,y,k,fl,a)=>{a=a||{ox:0,oy:0,sx:1,sy:1,rot:0};ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.fillStyle='#0003';ctx.strokeStyle='#ffffffa0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,s.sy!==undefined?s.sy*k:s.height*k*.3,s.sw!==undefined?s.sw*k:s.width*k*.42,s.sh!==undefined?s.sh*k:s.height*k*.15,0,0,6.3);ctx.fill();ctx.stroke();ctx.translate(Math.round(a.ox),Math.round(a.oy));ctx.rotate(a.rot);ctx.scale(a.sx,a.sy);if(fl)ctx.scale(1,-1);ctx.drawImage(a.f?flash(s):s,-s.width*k/2,-s.height*k/2,s.width*k,s.height*k);ctx.restore()};
 const eSp=()=>{if((e.hp>0||G.wait>1.6)&&!e.hid){ctx.globalAlpha=e.hp>0?1:.4;sp(mon(e,1),e.x,e.y,e.boss?3:2,0,animOf(e,p.x,p.y,1));ctx.globalAlpha=1;
  if(e.tele>0){const k=1-e.tele/e.tm;ctx.strokeStyle='#ff3b3b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,e.r+4+k*18,0,6.3);ctx.stroke();ctx.fillStyle='#ff3b3b55';ctx.beginPath();ctx.arc(e.x,e.y,(e.r+4)*k,0,6.3);ctx.fill()}}};
 const pSp=()=>{if(!(p.inv>0&&Math.floor(G.time*20)%2)&&!p.hid){ctx.globalAlpha=p.dT>0?.5:1;sp(mon(p,0),p.x,p.y,2,0,animOf(p,e.x,e.y,0));ctx.globalAlpha=1}};
 drawRocks(eSp,pSp);drawBullets();
 for(let i=0;i<3;i++)if(p.ch[i]>0){ctx.strokeStyle=i==2?'#ffd23f':'#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,18+p.ch[i]*14,0,6.3*p.ch[i]);ctx.stroke()}
 drawArenaFg();drawFx();ctx.textAlign='center';ctx.lineJoin='round';for(const t of txt){ctx.font=`italic 900 ${t.f||16}px "Courier New",monospace`;ctx.globalAlpha=Math.min(1,t.t*2);ctx.strokeStyle='#3a2a1a';ctx.lineWidth=4;ctx.strokeText(t.s,t.x,t.y);ctx.fillStyle=t.c;ctx.fillText(t.s,t.x,t.y)}ctx.globalAlpha=1;
 ctx.restore();offscreenArrow(p,e);
 // HUD
 const bar=(x,y,w,v,c,n)=>{ctx.fillStyle='#000a';ctx.fillRect(x-2,y-2,w+4,14);ctx.fillStyle=c;ctx.fillRect(x,y,w*Math.max(0,v),10);ctx.fillStyle='#fff';ctx.font='bold 10px "Courier New",monospace';ctx.textAlign='left';ctx.fillText(n,x+3,y+9)};
 ctx.save();ctx.scale(UIK.hud,UIK.hud);hud();ctx.restore();
 
 if(G.intro>0){ctx.fillStyle='#000a';ctx.fillRect(0,VH/2-30,VW,60);ctx.fillStyle='#fff';ctx.font='bold 22px "Courier New",monospace';ctx.textAlign='center';ctx.fillText(e.boss?'COMBAT FINAL !':`Combat ${G.wave+1}`,VW/2,VH/2+8)}
 drawScreenFx();ctx.restore();
 for(let i=0;i<3;i++){const b=bt[i],m=p.mv[i];b.firstChild&&(b.querySelector('i').style.height=Math.max(0,p.cd[i]/p.cm[i])*100+'%',b.querySelector('em').style.width=p.ch[i]*100+'%',b.style.borderColor=COL[m.tp||p.t])}
 bt[3].querySelector('i').style.height=Math.max(0,p.dC/1.3)*100+'%'}
function loop(t){const dt=Math.min(.05,(t-last)/1000);last=t;try{perfTick(dt);if(G&&!G.over&&!G.paused){step(dt*timeScale());if(G)draw()}}catch(err){reportError(err)}requestAnimationFrame(loop)}
