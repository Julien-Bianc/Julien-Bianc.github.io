// ============================================================
//  combat.js — Règles de combat : lancement d'une partie, apparition des ennemis, dégâts, statuts, IA, déroulement d'une image (step).
// ============================================================
function setSt(o,t,k){if(o.st||Math.random()>.3)return;if(t=='feu'){o.st='burn';o.stT=4;dmgTxt(o.x,o.y-50,'BRÛLÉ','#ff8a5a')}else if(t=='foudre'||k=='tide'){o.st='par';o.stT=2;dmgTxt(o.x,o.y-50,t=='foudre'?'PARALYSÉ':'RALENTI','#ffe24a')}}
function hurtE(d,b){const e=G.e;if(e.hp<=0||G.intro>0)return;const x=mult(b.t,e.t),dm=x===0?0:Math.max(1,Math.round(d*x));e.hp-=dm;hitFx(e.x,e.y,dm,x,1,b.t,b.col);setSt(e,b.t,b.k,b);if(b.drain){const p=G.p;p.hp=Math.min(p.max,p.hp+dm*b.drain);dmgTxt(p.x,p.y-34,'+'+Math.round(dm*b.drain*10),'#8dff9a')}if(e.hp<=0){e.hp=0;G.wait=2.2;dmgTxt(e.x,e.y,'K.O.','#ffd23f');bullets.length=0;zn.length=0;return 1}}
function hurtP(d,b){const p=G.p;if(p.inv>0||p.dT>0||p.hp<=0)return;const x=mult(b.t,p.t),dm=x===0?0:Math.max(1,Math.round(d*x));p.hp-=dm;p.inv=.6;hitFx(p.x,p.y,dm,x,0,b.t,b.col);setSt(p,b.t,b.k,b);if(p.hp<=0){p.hp=0;const nx=G.team.find(c=>c.hp>0);if(nx){doSwap(nx);G.swc=0}else{G.over=1;battleEnd(false)}return 1}}
function explode(b){fx.push({x:b.x,y:b.y,t:.45,mx:.45});G.shake=Math.max(G.shake,.2);crater(b.x,b.y,12,COL[b.t]||'#e8603c');for(let i=0;i<8;i++){const a=i*.785+Math.random()*.2;bullets.push({x:b.x,y:b.y,vx:Math.cos(a)*200,vy:Math.sin(a)*200,r:4,d:b.d*.4,t:b.t,k:'shot',own:b.own,life:.55,hit:0,age:0})}for(let i=0;i<14;i++)pt.push({x:b.x,y:b.y,vx:(Math.random()-.5)*260,vy:(Math.random()-.5)*260,g:0,t:.4,c:i%2?'#ffffff':(COL[b.t]||'#ff7a2c'),s:3})}
function cast(s,d,m,c,own,sc,ang){const a=ang??Math.atan2(d.y-s.y,d.x-s.x),sp=m.s*(own?1:(.85+Math.min(G.wave,3)*.03)*G.stage.pspeed),dm=m.d*(1+c*.9)*sc,t=m.tp||s.t,k=m.k,ox=s.x+Math.cos(a)*16,oy=s.y+Math.sin(a)*16,R=Math.random;
 const B=o=>{const an=o.an??a,v=o.sp||sp;bullets.push({x:ox,y:oy,vx:Math.cos(an)*v,vy:Math.sin(an)*v,r:5,d:dm,t,k,own,life:3,hit:0,age:0,...o})};
 if(k=='shot'||k=='leaf')B({r:5*(1+c*.5)});
 else if(k=='bolt')B({sp:sp*1.35,r:4*(1+c*.4)});
 else if(k=='flame'){for(let i=0;i<7;i++)B({an:a+(R()-.5)*.8,sp:sp*(.6+R()*.5),r:5+R()*3,d:dm*.55,life:.5})}
 else if(k=='meteor')B({sp:sp*.8,r:11*(1+c*.5),split:1,life:1.2});
 else if(k=='wave'){for(let i=0;i<2;i++)B({wave:1,amp:26,ph:i*Math.PI,bx:ox,by:oy,r:5,d:dm*.9})}
 else if(k=='tide')B({sp:sp*.7,r:16*(1+c*.6),pierce:1,life:2.2});
 else if(k=='spore'){for(let i=0;i<5;i++)B({an:a+(i-2)*.45,sp:sp*.7,r:4,d:dm*.7,home:2.2,life:2.5})}
 else if(k=='drain')B({sp:sp*.8,r:8*(1+c*.4),home:3,drain:.35,life:2.5});
 else if(k=='strike'){const n=c>.5?3:1;for(let i=0;i<n;i++){const off=n>1?(i-1)*58:0;zn.push({x:Math.max(30,Math.min(W-30,d.x+off)),y:Math.max(44,Math.min(H-34,d.y+(off?R()*30-15:0))),t:.85,mx:.85,r:34+c*14,d:dm*3.4,own,tp:t})}}
 else if(k=='beam'){const w=10+c*12;bm.push({x:s.x,y:s.y,a,len:520,t:.35,mx:.35,w,tp:t});const dx=d.x-s.x,dy=d.y-s.y,al=dx*Math.cos(a)+dy*Math.sin(a),pd=Math.abs(-dx*Math.sin(a)+dy*Math.cos(a));if(al>0&&pd<d.r+w/2){const b={t,k,own};if(own)hurtE(dm,b);else hurtP(dm,b)}}}
function fire(m,c,i){
  // Visée : glisser le doigt depuis le bouton = tir précis (x1,25 dégâts) ; simple appui = tir assisté vers l'ennemi
  const p=G.p,e=G.e,A=AIM.take(i,p,e);
  lbl(0,m.n+(c>.5?' +':''),p.t);p.atk=p.atkD=.3;
  let tgt=e;
  if(A.manual&&(m.k==='strike'||m.fly||m.pool))tgt={x:Math.max(30,Math.min(W-30,p.x+Math.cos(A.ang)*A.range)),y:Math.max(44,Math.min(H-34,p.y+Math.sin(A.ang)*A.range)),r:e.r};
  cast(p,tgt,m,c,1,A.manual?1.25:1,A.ang)}
function eFire(){
  // L'ennemi anticipe plus ou moins ton déplacement selon la difficulté du niveau (G.stage.aim : 0 à 1)
  const e=G.e,p=G.p,m=MV[e.t][e.pat],S=G.stage;
  lbl(1,m.n,e.t);e.atk=e.atkD=.35;
  const sc=S.dmg*(1+.12*Math.min(G.wave,3)+(e.boss?.25:0))*(isBig(m)?.75:1),ch=e.boss&&(isBig(m)||m.k=='strike')?.6:0;
  const sp=(m.fan&&m.fan.speed)||m.s||300,dist=Math.hypot(p.x-e.x,p.y-e.y),T=dist/Math.max(120,sp*.9)*S.aim;
  const tgt={x:Math.max(30,Math.min(W-30,p.x+(p.vx||0)*T)),y:Math.max(44,Math.min(H-34,p.y+(p.vy||0)*T)),r:p.r};
  cast(e,m.k=='beam'?p:tgt,m,ch,0,sc,m.k=='beam'?e.aim:undefined)}
// cfg = { team:[ids], enemies:[ids], stage:{…}, mode:'solo', size, stageIndex, arena }
function start(cfg){
  const team=cfg.team.map(mkp);
  G={team,p:team[0],et:cfg.enemies,stage:cfg.stage||STAGE_DEFAULT,cfg,wave:0,time:0,shake:0,wait:0,over:0,swc:0};
  bullets.length=0;txt.length=0;fx.length=0;rocks=ROCK_LAYOUT.map(([x,y])=>({x:W*x,y:H*y,r:16,hp:60,m:60}));CAM.init=false;setBtns();spawn();menu('');last=performance.now()}
function spawn(){
  const w=G.wave,t=G.et[w],boss=G.et.length>=3&&w==G.et.length-1,S=G.stage;
  makeArena(S.arena!==undefined?S.arena:w);TR.getContext('2d').clearRect(0,0,W,H);pt.length=0;zn.length=0;bm.length=0;
  const hp=Math.round(HERO[t].hp*S.hp*(boss?S.boss:1)*(1+.05*w));
  G.e={t,x:G.p.x<W/2?G.p.x+380:G.p.x-380,y:G.p.y,hp,r:boss?36:24,tele:0,next:1.6,pat:0,ph:Math.random()*6,boss,intro:1.6,st:null,stT:0};G.e.max=G.e.hp;G.intro=1.6}

function step(dt){DT=dt;if(HS>0){HS-=dt;return}const p=G.p,e=G.e;G.time+=dt;if(G.swc>0)G.swc-=dt;
 if(G.wait>0){G.wait-=dt;if(G.wait<=0){G.wait=0;G.wave++;if(G.wave>=G.et.length){G.over=1;battleEnd(true);return}spawn()}}
 kx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);ky=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
 let dx=jx+kx,dy=jy+ky;const m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}
 let sp=p.sp*(p.ch.some(c=>c>0)?.55:1)*(p.st=='par'?.5:1)*(p.exh>G.time?.6:1)*(p.boost>G.time?(p.boostK||1.3):1);if(p.dT>0){p.dT-=dt;dx=p.dx;dy=p.dy;sp=520}
 p.x=Math.max(30,Math.min(W-30,p.x+dx*sp*dt));p.y=Math.max(44,Math.min(H-34,p.y+dy*sp*dt));
 for(let i=0;i<3;i++){if(p.cd[i]>0)p.cd[i]-=dt;if(down[i]&&p.cd[i]<=0)p.ch[i]=Math.min(1,p.ch[i]+dt/(isBig(p.mv[i])?1.1:.7))}
 if(p.dC>0)p.dC-=dt;if(p.inv>0)p.inv-=dt;
 if(p.st){p.stT-=dt;if(p.st=='burn'||p.st=='psn')p.hp-=2.5*dt;if(p.stT<=0)p.st=null}
 if(e.st){e.stT-=dt;if(e.st=='burn'||e.st=='psn')e.hp-=3*dt;if(e.stT<=0)e.st=null}
 if(G.intro>0)G.intro-=dt;
 if(e.hp>0&&!G.wait){const dd=300+Math.sin(G.time*.7+e.ph)*70,an=Math.atan2(H/2-p.y,W/2-p.x)+Math.sin(G.time*.5+e.ph)*1.1,tx=Math.max(50,Math.min(W-50,p.x+Math.cos(an)*dd)),ty=Math.max(60,Math.min(H-50,p.y+Math.sin(an)*dd)),pf=e.st=='par'?.5:1;
  e.y+=(ty-e.y)*Math.min(1,dt*2*pf);e.x+=(tx-e.x)*Math.min(1,dt*(1.8+Math.min(G.wave,3)*.35)*pf*G.stage.speed);
  if(G.intro<=0){if(e.tele>0){e.tele-=dt;if(e.tele<=0){eFire();e.next=Math.max(.4,1.25-Math.min(G.wave,3)*.2-(e.boss?.25:0))*(.8+Math.random()*.4)*G.stage.rate}}else{e.next-=dt;if(e.next<=0){e.pat=e.boss?Math.floor(Math.random()*3):Math.floor(Math.random()*(G.wave>0?3:2));const big=isBig(MV[e.t][e.pat]);e.tele=Math.max(.3,((big?.95:.6)-Math.min(G.wave,3)*.1)*G.stage.tele);e.tm=e.tele;if(MV[e.t][e.pat].k=='beam')e.aim=Math.atan2(p.y-e.y,p.x-e.x)}}}}
 let ko=0;
 for(let i=bullets.length-1;i>=0&&!ko;i--){const b=bullets[i];b.age=(b.age||0)+dt;
  if(b.home){const tg=b.own?e:G.p,s=Math.hypot(b.vx,b.vy),ca=Math.atan2(b.vy,b.vx);let da=Math.atan2(tg.y-b.y,tg.x-b.x)-ca;da=Math.atan2(Math.sin(da),Math.cos(da));const n=ca+da*Math.min(1,dt*b.home);b.vx=Math.cos(n)*s;b.vy=Math.sin(n)*s}
  if(b.wave){b.bx+=b.vx*dt;b.by+=b.vy*dt;const s=Math.hypot(b.vx,b.vy),o=b.amp*Math.sin(b.age*9+b.ph);b.x=b.bx-b.vy/s*o;b.y=b.by+b.vx/s*o}else{b.x+=b.vx*dt;b.y+=b.vy*dt}
  if((b.life-=dt)<=0||b.x<-30||b.x>W+30||b.y<-30||b.y>H+30){if(b.split&&b.life<=0)explode(b);bullets.splice(i,1);continue}
  let blk=0;for(const r of rocks){if(r.hp>0&&Math.hypot(b.x-r.x,b.y-r.y)<r.r+b.r){r.hp-=b.d;fx.push({x:r.x,y:r.y,t:.3,mx:.3});if(r.hp<=0)fx.push({x:r.x,y:r.y,t:.5,mx:.5});if(!b.pierce)blk=1;break}}
  if(blk){if(b.split)explode(b);bullets.splice(i,1);continue}
  if(b.own){if(e.hp>0&&G.intro<=0&&!b.hit&&Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){const spl=b.split;if(hurtE(b.d,b))ko=1;if(!b.pierce)bullets.splice(i,1);else b.hit=1;if(spl&&!ko)explode(b)}}
  else if(p.inv<=0&&p.dT<=0&&Math.hypot(b.x-p.x,b.y-p.y)<b.r+p.r*.7){const spl=b.split;bullets.splice(i,1);if(spl)explode(b);if(hurtP(b.d,b))return}}
 for(let i=zn.length-1;i>=0;i--){const z=zn[i];z.t-=dt;if(z.t<=0){bm.push({x:z.x,y:z.y,col:1,t:.3,mx:.3,tp:z.tp});fx.push({x:z.x,y:z.y,t:.4,mx:.4});HS=Math.max(HS,.04);G.shake=Math.max(G.shake,.2);const b={t:z.tp,k:'strike',own:z.own};zn.splice(i,1);if(z.own){if(G.e.hp>0&&Math.hypot(z.x-G.e.x,z.y-G.e.y)<z.r+G.e.r)hurtE(z.d,b)}else if(Math.hypot(z.x-G.p.x,z.y-G.p.y)<z.r+G.p.r*.6){if(hurtP(z.d,b))return}}}
 for(let i=bm.length-1;i>=0;i--)if((bm[i].t-=dt)<=0)bm.splice(i,1);
 for(let i=fx.length-1;i>=0;i--)if((fx[i].t-=dt)<=0)fx.splice(i,1);lb.forEach(l=>l&&(l.ttl-=dt));
 for(let i=txt.length-1;i>=0;i--){txt[i].t-=dt;txt[i].y-=40*dt;if(txt[i].t<=0)txt.splice(i,1)}
 for(let i=pt.length-1;i>=0;i--){const q=pt[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=q.g*dt;if((q.t-=dt)<=0)pt.splice(i,1)}
 if(G.shake>0)G.shake-=dt;bt[4].querySelector('i').style.height=Math.max(0,G.swc/3)*100+'%'}
// Une attaque est « lourde » (charge plus lente, signal d'ennemi plus long) si sa puissance > 15
function isBig(m){ return m.big!==undefined ? m.big : m.d>15; }

