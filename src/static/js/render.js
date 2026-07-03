'use strict';
/* ================================================================
   CHAOS CHEF — vẽ canvas (HUD, bếp, người chơi...) + phát âm thanh
   theo diff giữa 2 view liên tiếp (dùng chung cho host lẫn client).
   ================================================================ */

// ---------- Vẽ ----------
const cv = el('cv'), ctx = cv.getContext('2d');
const dark = document.createElement('canvas');
dark.width = W; dark.height = GRID_H*TILE;
const dctx = dark.getContext('2d');
const animT = () => performance.now()/1000;

function rr(c,x,y,w,h,r){
  c.beginPath();
  c.moveTo(x+r,y);
  c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r);     c.arcTo(x,y,x+w,y,r);
  c.closePath();
}
function txt(t,x,y,size,color='#fff',align='center',bold=false){
  ctx.fillStyle=color; ctx.textAlign=align; ctx.textBaseline='middle';
  ctx.font=`${bold?'700 ':''}${size}px 'Segoe UI','Segoe UI Emoji',sans-serif`;
  ctx.fillText(t,x,y);
}

function draw(v){
  ctx.fillStyle='#14152a'; ctx.fillRect(0,0,W,H);
  drawWorld(v);
  if (v.blackout>0) drawDark(v);
  drawHUD(v);
  drawToasts(v);
  drawBanner(v);
}

function drawWorld(v){
  ctx.save(); ctx.translate(0,HUD_H);
  for (let gx=1; gx<GRID_W-1; gx++) for (let gy=1; gy<GRID_H-1; gy++){
    ctx.fillStyle = (gx+gy)%2 ? '#efe4d3' : '#e5d7c2';
    ctx.fillRect(gx*TILE, gy*TILE, TILE, TILE);
  }
  ctx.fillStyle='#3b3557';
  ctx.fillRect(0,0,W,TILE);
  ctx.fillRect(0,(GRID_H-1)*TILE,W,TILE);
  ctx.fillRect(0,0,TILE,GRID_H*TILE);
  ctx.fillRect((GRID_W-1)*TILE,0,TILE,GRID_H*TILE);
  for (let i=0;i<STATIONS.length;i++) drawStation(STATIONS[i], i, v);
  if (v.slip>0){                                   // 🧼 sàn trơn lấp lánh
    ctx.globalAlpha=.5;
    for (let k=0;k<6;k++)
      txt('✨', TILE*2+((k*137)%(W-TILE*4)), TILE*1.6+((k*211)%(TILE*5)), 16);
    ctx.globalAlpha=1;
  }
  if (v.rat){                                      // 🐀 chuột
    txt('🐀', v.rat.x, v.rat.y, 24);
    if (v.rat.e) txt(v.rat.e, v.rat.x+15, v.rat.y-14, 14);
  }
  for (const q of (v.projs||[])){                  // 🤾 đồ bay xoay vòng
    ctx.save(); ctx.translate(q.x,q.y); ctx.rotate((animT()*12)%6.283); txt(q.e,0,0,20); ctx.restore();
  }
  [...v.players].sort((a,b)=>a.y-b.y).forEach(drawPlayer);
  ctx.restore();
}

function drawStation(s,i,v){
  const x=s.x*TILE, y=s.y*TILE, cx=x+TILE/2, cy=y+TILE/2;
  ctx.fillStyle='#57506e'; rr(ctx,x+3,y+3,TILE-6,TILE-6,10); ctx.fill();
  ctx.strokeStyle='#736a92'; ctx.lineWidth=2; ctx.stroke();
  const label = (t,c='#e8e2f5') => txt(t,cx,y+TILE-9,10,c,'center',true);
  if (s.type==='crate'){
    txt('📦',cx,cy-8,24);
    txt(ING[s.ing].emoji,cx+15,cy+2,16);
    label(ING[s.ing].name);
  } else if (s.type==='chop'){ txt('🔪',cx,cy-6,24); label('Thớt'); }
  else if (s.type==='sink'){   txt('🚿',cx,cy-6,24); label('Vòi nước'); }
  else if (s.type==='trash'){  txt('🗑️',cx,cy-6,24); label('Sọt rác'); }
  else if (s.type==='switch'){ txt('💡',cx,cy-6,24); label('Công tắc'); }
  else if (s.type==='serve'){  txt('🛎️',cx,cy-6,24); label('Quầy giao','#ffd54a'); }
  else if (s.type==='stove'){
    const st = v.stoves[STOVE_IDX.indexOf(i)];
    if (st.fire){
      const sc = 1 + 0.18*Math.sin(animT()*18);
      ctx.save(); ctx.translate(cx,cy-4); ctx.scale(sc,sc); txt('🔥',0,0,30); ctx.restore();
      label('CHÁY!!!','#ff7676');
    } else {
      ctx.fillStyle='#2b2740'; ctx.beginPath(); ctx.arc(cx,cy-4,16,0,7); ctx.fill();
      if (st.item){
        txt(ING[st.item].emoji,cx,cy-4,20);
        const bw=TILE-16;
        ctx.fillStyle='#00000055'; rr(ctx,x+8,y+TILE-15,bw,7,3); ctx.fill();
        ctx.fillStyle = st.st==='cook' ? '#ffb347' : (st.frac>0.6 ? '#ff5a5f' : '#35d461');
        rr(ctx,x+8,y+TILE-15,bw*clamp(st.frac,0.05,1),7,3); ctx.fill();
        if (st.st==='ready' && Math.sin(animT()*10)>0) txt('CHÍN!',cx,y+9,10,'#7dff9b','center',true);
      } else label('Bếp');
    }
  }
}

function drawPlayer(p){
  ctx.fillStyle='rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(p.x,p.y+PR-3,PR*0.8,7,0,0,7); ctx.fill();
  ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,PR,0,7); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.75)'; ctx.lineWidth=2.5; ctx.stroke();
  txt(p.face,p.x,p.y-2,24);
  txt(p.name,p.x,p.y+PR+11,11,'#3b3557','center',true);
  if (p.carry){
    const cyy=p.y-PR-15;
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(p.x,cyy,13,0,7); ctx.fill();
    ctx.lineWidth=3;
    ctx.strokeStyle = p.carry.bucket ? '#4fc3f7' : (p.carry.st==='ready' ? '#35d461' : '#999');
    ctx.stroke();
    txt(p.carry.bucket ? '💧' : ING[p.carry.ing].emoji, p.x, cyy, 15);
  }
  if (p.chop>0){
    const bw=46;
    ctx.fillStyle='#00000088'; rr(ctx,p.x-bw/2,p.y-PR-36,bw,7,3); ctx.fill();
    ctx.fillStyle='#ffd54a';   rr(ctx,p.x-bw/2,p.y-PR-36,bw*p.chop,7,3); ctx.fill();
    txt('🔪 chặt chặt...',p.x,p.y-PR-46,11,'#ffd54a','center',true);
  }
  if (p.stun>0){
    txt('😤',p.x+PR+4, p.y-PR+Math.sin(animT()*4)*4, 20);
    txt('ĐÌNH CÔNG!',p.x,p.y-PR-34,11,'#ff5a5f','center',true);
  }
  if (p.confuse){                                  // 🌀 đang bị đảo phím
    ctx.save(); ctx.translate(p.x+PR+6, p.y-PR-4); ctx.rotate((animT()*6)%6.283); txt('🌀',0,0,16); ctx.restore();
  }
  if (p.phone>0){                                  // 📞 sếp gọi
    txt('📱', p.x, p.y-PR-16, 20);
    txt(`SẾP GỌI! Bấm tương tác x${p.phone}`, p.x, p.y-PR-34, 11, '#ff5a5f','center',true);
  }
  if (p.emote){                                    // 💬 bong bóng emote
    ctx.font='700 13px "Segoe UI",sans-serif';
    const w = ctx.measureText(p.emote).width+18;
    ctx.fillStyle='#fff'; rr(ctx, p.x-w/2, p.y-PR-58, w, 24, 10); ctx.fill();
    ctx.strokeStyle='#3b3557'; ctx.lineWidth=2; ctx.stroke();
    txt(p.emote, p.x, p.y-PR-46, 13, '#222','center',true);
  }
}

function drawDark(v){
  dctx.globalCompositeOperation='source-over';
  dctx.clearRect(0,0,W,dark.height);
  dctx.fillStyle='rgba(5,5,12,0.94)';
  dctx.fillRect(0,0,W,dark.height);
  dctx.globalCompositeOperation='destination-out';
  for (const p of v.players){
    const g=dctx.createRadialGradient(p.x,p.y,20,p.x,p.y,120);
    g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(1,'rgba(0,0,0,0)');
    dctx.fillStyle=g; dctx.beginPath(); dctx.arc(p.x,p.y,120,0,7); dctx.fill();
  }
  const sw = STATIONS.find(s=>s.type==='switch');
  const g2 = dctx.createRadialGradient(stCX(sw),stCY(sw),5,stCX(sw),stCY(sw),75);
  g2.addColorStop(0,'rgba(0,0,0,.95)'); g2.addColorStop(1,'rgba(0,0,0,0)');
  dctx.fillStyle=g2; dctx.beginPath(); dctx.arc(stCX(sw),stCY(sw),75,0,7); dctx.fill();
  ctx.drawImage(dark,0,HUD_H);
}

function drawHUD(v){
  txt(`💰 ${fmtMoney(v.money)}đ`,12,17,16,'#ffd54a','left',true);
  txt(v.ln,W/2,10,12.5,'#b8b2c8','center',true);
  const pw=220, px=W/2-pw/2;
  ctx.fillStyle='#2a2c48'; rr(ctx,px,19,pw,8,4); ctx.fill();
  ctx.fillStyle='#35d461'; rr(ctx,px,19,pw*clamp(v.money/v.target,0,1),8,4); ctx.fill();
  txt(`/${fmtMoney(v.target)}đ`,px+pw+6,23,10.5,'#8f89a3','left');
  const t=Math.ceil(v.tleft), mm=Math.floor(t/60), ss=String(t%60).padStart(2,'0');
  const tcol = t<=30 ? (Math.sin(animT()*8)>0 ? '#ff5a5f' : '#fff') : '#fff';
  txt(`⏱ ${mm}:${ss}`,W-12,17,18,tcol,'right',true);
  const n = v.orders.length;
  const gapX = n>1 ? Math.min(148, (W-16-140)/(n-1)) : 0;   // tự co khi nhiều đơn (VIP có thể vượt max)
  v.orders.forEach((o,i)=>drawOrder(o, 8+i*gapX, 36));
  if (!v.orders.length) txt('Chưa có đơn... nghỉ xíu ☕',W/2,86,14,'#8f89a3');
}

function drawOrder(o,x,y){
  const w=140, h=106;
  ctx.fillStyle = o.vip ? '#ffd54a' : '#f7f3ea';
  rr(ctx,x,y,w,h,10); ctx.fill();
  if (o.vip){ ctx.strokeStyle='#b8860b'; ctx.lineWidth=2.5; ctx.stroke(); }
  txt(o.emoji,x+20,y+20,24);
  txt(o.name,x+38,y+14,12.5,'#333','left',true);
  txt(`+${fmtMoney(o.reward)}đ`,x+38,y+30,11,'#0a7d33','left',true);
  if (o.vip) txt('👑 VIP',x+w-8,y+44,11,'#7a5800','right',true);
  o.ings.forEach((ing,k)=>{
    const ix=x+18+k*27, iy=y+58;
    ctx.globalAlpha = ing.d ? 1 : .35;
    txt(ing.e,ix,iy,20);
    ctx.globalAlpha = 1;
    if (ing.d) txt('✔',ix+9,iy+8,13,'#0a7d33','center',true);
  });
  const frac = clamp(o.rem/o.total,0,1);
  const col = o.rem<0 ? (Math.sin(animT()*10)>0 ? '#ff2222' : '#880000')
            : frac>.5 ? '#35d461' : frac>.25 ? '#ffb347' : '#ff5a5f';
  ctx.fillStyle='#00000022'; rr(ctx,x+8,y+h-16,w-16,8,4); ctx.fill();
  ctx.fillStyle=col;         rr(ctx,x+8,y+h-16,(w-16)*Math.max(frac,0.03),8,4); ctx.fill();
  if (o.rem<0) txt('KHÁCH SẮP BỎ ĐI!',x+w/2,y+h-25,9.5,'#cc0000','center',true);
}

function drawToasts(v){
  v.toasts.forEach((t,i)=>{
    const y = H-18-(v.toasts.length-1-i)*27;
    ctx.font='700 14px "Segoe UI",sans-serif';
    const w = ctx.measureText(t.text).width+26;
    ctx.fillStyle='rgba(10,10,20,.82)'; rr(ctx,W/2-w/2,y-13,w,25,12); ctx.fill();
    txt(t.text,W/2,y,14,t.color,'center',true);
  });
}

function drawBanner(v){
  if (!v.banner) return;
  const y=HUD_H+170, sc=1+0.05*Math.sin(animT()*9);
  ctx.save(); ctx.translate(W/2,y); ctx.scale(sc,sc);
  ctx.font='900 28px "Segoe UI",sans-serif';
  const w=ctx.measureText(v.banner).width+50;
  ctx.fillStyle='rgba(20,4,8,.85)'; rr(ctx,-w/2,-27,w,54,14); ctx.fill();
  ctx.strokeStyle='#ff5a5f'; ctx.lineWidth=3; ctx.stroke();
  txt(v.banner,0,0,28,'#ffd54a','center',true);
  ctx.restore();
}

// ---------- Âm thanh theo diff (chạy cho cả host lẫn client) ----------
function playDiffs(prev,v){
  if (!prev || !v) return;
  if (v.money > prev.money) SFX.coin();
  if (v.money < prev.money) SFX.buzz();
  const fires = s => s.stoves.filter(x=>x.fire).length;
  if (fires(v) > fires(prev)) SFX.alarm();
  const ready = s => s.stoves.filter(x=>x.st==='ready').length;
  if (ready(v) > ready(prev)) SFX.ding();
  if (v.orders.length > prev.orders.length) SFX.bell();
  const carr = s => s.players.filter(p=>p.carry).length;
  if (carr(v) > carr(prev)) SFX.pick();
  if (carr(v) < carr(prev) && v.money === prev.money) SFX.place();
  const pj = s => (s.projs||[]).length;
  if (pj(v) > pj(prev)){ tone(760,.05); tone(520,.08,'square',.12,.05); }   // tiếng ném vèo
  if (v.rat && !prev.rat){ tone(1200,.06); tone(1400,.06,'square',.12,.08); } // chít chít
  if (MODE==='client' && v.blackout>0 && prev.blackout<=0) SFX.spark();
}
