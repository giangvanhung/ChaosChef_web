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
// Chữ hiển thị (Fredoka) rơi về Segoe UI khi webfont chưa tải xong; emoji luôn
// lấy từ Segoe UI Emoji nên sprite không bao giờ mất.
const FONT = `'Fredoka','Nunito','Segoe UI','Segoe UI Emoji',sans-serif`;
function txt(t,x,y,size,color='#fff',align='center',bold=false){
  ctx.fillStyle=color; ctx.textAlign=align; ctx.textBaseline='middle';
  ctx.font=`${bold?'700 ':'500 '}${size}px ${FONT}`;
  ctx.fillText(t,x,y);
}
// Chữ có viền tối phía sau — cách rẻ nhất để giữ tương phản khi chữ nằm trên
// nền sáng tối lẫn lộn (tên người chơi trên sàn, nhãn trạm trên thân trạm).
function txtOutline(t,x,y,size,color,align='center',ow=3,oc='rgba(0,0,0,.55)'){
  ctx.textAlign=align; ctx.textBaseline='middle';
  ctx.font=`700 ${size}px ${FONT}`;
  ctx.lineJoin='round'; ctx.lineWidth=ow; ctx.strokeStyle=oc;
  ctx.strokeText(t,x,y);
  ctx.fillStyle=color; ctx.fillText(t,x,y);
}
// Khối clay: bóng đổ + thân + mặt trên sáng + viền tối
function clay(c,x,y,w,h,r,body,top,border,lift=5){
  c.save();
  c.fillStyle='rgba(0,0,0,.28)'; rr(c,x+2,y+lift,w,h,r); c.fill();
  c.fillStyle=body;              rr(c,x,y,w,h,r); c.fill();
  c.strokeStyle=border; c.lineWidth=3; c.stroke();
  c.save(); rr(c,x,y,w,h,r); c.clip();
  c.fillStyle=top; rr(c,x,y,w,h*0.45,r); c.fill();
  c.restore();
  c.restore();
}
// Thanh tiến trình bo tròn, có rãnh chìm
function bar(c,x,y,w,h,frac,col){
  c.fillStyle='rgba(0,0,0,.35)'; rr(c,x,y,w,h,h/2); c.fill();
  c.fillStyle=col; rr(c,x,y,Math.max(w*clamp(frac,0,1),h), h, h/2); c.fill();
}

// ---------- Sàn bếp: dựng sẵn một lần, mỗi khung hình chỉ vẽ lại như một ảnh ----------
const floorCv = document.createElement('canvas');
floorCv.width = W; floorCv.height = GRID_H*TILE;
(function buildFloor(){
  const f = floorCv.getContext('2d');
  for (let gx=1; gx<GRID_W-1; gx++) for (let gy=1; gy<GRID_H-1; gy++){
    f.fillStyle = (gx+gy)%2 ? T.floorA : T.floorB;
    f.fillRect(gx*TILE, gy*TILE, TILE, TILE);
    f.strokeStyle = T.grout; f.lineWidth = 1;
    f.strokeRect(gx*TILE+0.5, gy*TILE+0.5, TILE-1, TILE-1);
  }
  // Quầy bao quanh: thân tím + mép trên sáng cho có bề dày
  const wall = (x,y,w,h) => {
    f.fillStyle=T.wall; f.fillRect(x,y,w,h);
    f.fillStyle=T.wallTop; f.fillRect(x,y,w,6);
  };
  wall(0,0,W,TILE);
  wall(0,(GRID_H-1)*TILE,W,TILE);
  wall(0,0,TILE,GRID_H*TILE);
  wall((GRID_W-1)*TILE,0,TILE,GRID_H*TILE);
  // Bóng đổ của quầy xuống sàn
  const sh = f.createLinearGradient(0,TILE,0,TILE+14);
  sh.addColorStop(0,'rgba(0,0,0,.22)'); sh.addColorStop(1,'rgba(0,0,0,0)');
  f.fillStyle=sh; f.fillRect(TILE,TILE,W-TILE*2,14);
})();

function draw(v){
  ctx.fillStyle=T.ink; ctx.fillRect(0,0,W,H);
  drawWorld(v);
  if (v.blackout>0) drawDark(v);
  drawHUD(v);
  drawToasts(v);
  drawBanner(v);
}

function drawWorld(v){
  ctx.save(); ctx.translate(0,HUD_H);
  ctx.drawImage(floorCv,0,0);
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
  const [body,top,border] = ST_CLAY[s.type];
  clay(ctx, x+3, y+3, TILE-6, TILE-9, 13, body, top, border, 4);
  const label = (t,c=T.text) => txtOutline(t,cx,y+TILE-11,9.5,c);
  if (s.type==='crate'){
    txt('📦',cx,cy-9,25);
    txt(ING[s.ing].emoji,cx+16,cy+1,16);
    label(ING[s.ing].name);
  } else if (s.type==='chop'){ txt('🔪',cx,cy-7,25); label('Thớt'); }
  else if (s.type==='sink'){   txt('🚿',cx,cy-7,25); label('Vòi nước'); }
  else if (s.type==='trash'){  txt('🗑️',cx,cy-7,25); label('Sọt rác'); }
  else if (s.type==='switch'){ txt('💡',cx,cy-7,25); label('Công tắc'); }
  else if (s.type==='serve'){
    // Quầy giao là đích đến — cho nó quầng sáng vàng để hút mắt
    const pulse = 0.5 + 0.5*Math.sin(animT()*2.5);
    ctx.save(); ctx.globalAlpha = 0.18 + 0.16*pulse;
    ctx.fillStyle=T.gold; ctx.beginPath(); ctx.arc(cx,cy-4,30,0,7); ctx.fill();
    ctx.restore();
    txt('🛎️',cx,cy-7,25); label('Quầy giao',T.money);
  }
  else if (s.type==='stove'){
    const st = v.stoves[STOVE_IDX.indexOf(i)];
    if (st.fire){
      const sc = 1 + 0.18*Math.sin(animT()*18);
      ctx.save(); ctx.globalAlpha=.35; ctx.fillStyle='#ff5a1f';
      ctx.beginPath(); ctx.arc(cx,cy-4,26*sc,0,7); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(cx,cy-4); ctx.scale(sc,sc); txt('🔥',0,0,30); ctx.restore();
      label('CHÁY!!!','#ff9a9a');
    } else {
      // mặt bếp: vòng tròn chìm
      ctx.fillStyle='#241f38'; ctx.beginPath(); ctx.arc(cx,cy-6,17,0,7); ctx.fill();
      ctx.strokeStyle='#100d1c'; ctx.lineWidth=2; ctx.stroke();
      if (st.item){
        txt(ING[st.item].emoji,cx,cy-6,20);
        bar(ctx, x+9, y+TILE-16, TILE-18, 7, st.frac,
            st.st==='cook' ? T.warn : (st.frac>0.6 ? T.bad : T.good));
        if (st.st==='ready' && Math.sin(animT()*10)>0) txtOutline('CHÍN!',cx,y+11,10,'#9dffb8');
      } else label('Bếp');
    }
  }
}

function drawPlayer(p){
  // bóng mềm dưới chân
  ctx.fillStyle='rgba(0,0,0,.22)';
  ctx.beginPath(); ctx.ellipse(p.x,p.y+PR-2,PR*0.82,7.5,0,0,7); ctx.fill();

  // thân clay: nền màu + gờ sáng phía trên + viền tối
  const g = ctx.createLinearGradient(0,p.y-PR,0,p.y+PR);
  g.addColorStop(0,'rgba(255,255,255,.42)'); g.addColorStop(.45,'rgba(255,255,255,0)');
  ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,PR,0,7); ctx.fill();
  ctx.fillStyle=g;       ctx.beginPath(); ctx.arc(p.x,p.y,PR,0,7); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.lineWidth=3; ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=1.5; ctx.stroke();
  txt(p.face,p.x,p.y-1,24);

  // biển tên: viên thuốc tối, chữ theo màu người chơi -> đọc được trên mọi nền sàn
  ctx.font=`700 11px ${FONT}`;
  const nw = ctx.measureText(p.name).width + 14;
  ctx.fillStyle='rgba(18,19,31,.82)'; rr(ctx,p.x-nw/2,p.y+PR+3,nw,17,8.5); ctx.fill();
  txt(p.name,p.x,p.y+PR+11.5,11,p.color,'center',true);

  if (p.carry){
    const cyy=p.y-PR-16;
    ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(p.x,cyy+3,13,0,7); ctx.fill();
    ctx.fillStyle='#fffdf7'; ctx.beginPath(); ctx.arc(p.x,cyy,13,0,7); ctx.fill();
    ctx.lineWidth=3.5;
    ctx.strokeStyle = p.carry.bucket ? '#4fc3f7' : (p.carry.st==='ready' ? T.good : '#a79f8e');
    ctx.stroke();
    txt(p.carry.bucket ? '💧' : ING[p.carry.ing].emoji, p.x, cyy, 15);
  }
  if (p.chop>0){
    bar(ctx, p.x-23, p.y-PR-36, 46, 7, p.chop, T.gold);
    txtOutline('🔪 chặt chặt...',p.x,p.y-PR-46,11,T.gold);
  }
  if (p.stun>0){
    txt('😤',p.x+PR+4, p.y-PR+Math.sin(animT()*4)*4, 20);
    txtOutline('ĐÌNH CÔNG!',p.x,p.y-PR-34,11,'#ff8a8a');
  }
  if (p.confuse){                                  // 🌀 đang bị đảo phím
    ctx.save(); ctx.translate(p.x+PR+6, p.y-PR-4); ctx.rotate((animT()*6)%6.283); txt('🌀',0,0,16); ctx.restore();
  }
  if (p.phone>0){                                  // 📞 sếp gọi
    txt('📱', p.x, p.y-PR-16, 20);
    txtOutline(`SẾP GỌI! Bấm tương tác x${p.phone}`, p.x, p.y-PR-34, 11, '#ff8a8a');
  }
  if (p.emote){                                    // 💬 bong bóng emote
    ctx.font=`700 13px ${FONT}`;
    const w = ctx.measureText(p.emote).width+20;
    const bx = p.x-w/2, by = p.y-PR-60;
    ctx.fillStyle='rgba(0,0,0,.25)'; rr(ctx,bx+1,by+4,w,26,12); ctx.fill();
    ctx.fillStyle='#fffdf7';         rr(ctx,bx,by,w,26,12); ctx.fill();
    ctx.strokeStyle=p.color; ctx.lineWidth=2.5; ctx.stroke();
    ctx.fillStyle='#fffdf7';                       // đuôi bong bóng
    ctx.beginPath(); ctx.moveTo(p.x-5,by+25); ctx.lineTo(p.x+5,by+25); ctx.lineTo(p.x,by+32); ctx.fill();
    txt(p.emote, p.x, by+13, 13, '#2a2740','center',true);
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
  // nền HUD tách khỏi sàn bằng một dải tối + vạch vàng
  const g = ctx.createLinearGradient(0,0,0,HUD_H);
  g.addColorStop(0,'#191a2e'); g.addColorStop(1,'#12131f');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,HUD_H);
  ctx.fillStyle='#2a2c48'; ctx.fillRect(0,HUD_H-2,W,2);

  // 💰 tiền: viên thuốc tối cho số nổi bật
  const mtxt = `💰 ${fmtMoney(v.money)}đ`;
  ctx.font=`700 17px ${FONT}`;
  const mw = ctx.measureText(mtxt).width + 22;
  ctx.fillStyle='#0d0e18'; rr(ctx,10,6,mw,28,14); ctx.fill();
  ctx.strokeStyle='#3a3550'; ctx.lineWidth=2; ctx.stroke();
  txt(mtxt,21,20,17,T.money,'left',true);

  // tên level + tiến độ doanh thu ở giữa
  txt(v.ln,W/2,11,12,T.dim,'center',true);
  const pw=240, px=W/2-pw/2;
  bar(ctx,px,22,pw,9, v.money/v.target, T.good);
  txt(`/${fmtMoney(v.target)}đ`,px+pw+8,27,10.5,T.dim,'left');

  // ⏱ đồng hồ: 30 giây cuối thì viên thuốc nhấp nháy đỏ, không chỉ đổi màu chữ
  const t=Math.ceil(v.tleft), mm=Math.floor(t/60), ss=String(t%60).padStart(2,'0');
  const hot = t<=30, blink = hot && Math.sin(animT()*8)>0;
  const ttxt = `⏱ ${mm}:${ss}`;
  ctx.font=`700 19px ${FONT}`;
  const tw = ctx.measureText(ttxt).width + 22;
  ctx.fillStyle = blink ? '#5a1418' : '#0d0e18';
  rr(ctx,W-10-tw,5,tw,30,15); ctx.fill();
  ctx.strokeStyle = hot ? T.bad : '#3a3550'; ctx.lineWidth=2; ctx.stroke();
  txt(ttxt,W-21,20,19, hot ? '#ffdede' : T.text,'right',true);

  const n = v.orders.length;
  const gapX = n>1 ? Math.min(148, (W-16-140)/(n-1)) : 0;   // tự co khi nhiều đơn (VIP có thể vượt max)
  v.orders.forEach((o,i)=>drawOrder(o, 8+i*gapX, 42));
  if (!v.orders.length) txt('Chưa có đơn... nghỉ xíu ☕',W/2,92,14,T.dim);
}

function drawOrder(o,x,y){
  const w=140, h=102;
  ctx.fillStyle='rgba(0,0,0,.35)'; rr(ctx,x+1,y+4,w,h,12); ctx.fill();
  ctx.fillStyle = o.vip ? '#fff3cf' : '#fffdf7';
  rr(ctx,x,y,w,h,12); ctx.fill();
  ctx.strokeStyle = o.vip ? '#b8860b' : '#ded5c3'; ctx.lineWidth = o.vip ? 3 : 2; ctx.stroke();

  // dải tiêu đề để tách tên món khỏi nguyên liệu
  ctx.save(); rr(ctx,x,y,w,h,12); ctx.clip();
  ctx.fillStyle = o.vip ? '#ffd76a' : '#f0e9da'; ctx.fillRect(x,y,w,34);
  ctx.restore();

  txt(o.emoji,x+19,y+17,22);
  txt(o.name,x+35,y+12,12.5,'#2a2740','left',true);
  txt(`+${fmtMoney(o.reward)}đ`,x+35,y+26,11,'#0a7d33','left',true);
  if (o.vip) txt('👑',x+w-13,y+17,15);

  o.ings.forEach((ing,k)=>{
    const ix=x+19+k*27, iy=y+58;
    if (ing.d){                                   // đã có: nền tròn xanh + dấu tick
      ctx.fillStyle='#dcf7e6'; ctx.beginPath(); ctx.arc(ix,iy,14,0,7); ctx.fill();
      ctx.strokeStyle=T.good; ctx.lineWidth=2; ctx.stroke();
      txt(ing.e,ix,iy,19);
      txt('✔',ix+10,iy+9,12,'#0a7d33','center',true);
    } else {                                      // chưa có: xám mờ
      ctx.globalAlpha=.32; txt(ing.e,ix,iy,19); ctx.globalAlpha=1;
    }
  });

  const frac = clamp(o.rem/o.total,0,1);
  const col = o.rem<0 ? (Math.sin(animT()*10)>0 ? '#ff2222' : '#880000')
            : frac>.5 ? T.good : frac>.25 ? T.warn : T.bad;
  bar(ctx,x+9,y+h-15,w-18,8,Math.max(frac,0.03),col);
  if (o.rem<0) txtOutline('KHÁCH SẮP BỎ ĐI!',x+w/2,y+h-26,9.5,'#d21f1f','center',2.5,'rgba(255,255,255,.9)');
}

function drawToasts(v){
  v.toasts.forEach((t,i)=>{
    const y = H-20-(v.toasts.length-1-i)*30;
    ctx.font=`700 14px ${FONT}`;
    const w = ctx.measureText(t.text).width+28;
    ctx.fillStyle='rgba(0,0,0,.3)';   rr(ctx,W/2-w/2+1,y-11,w,27,13.5); ctx.fill();
    ctx.fillStyle='rgba(14,15,26,.92)'; rr(ctx,W/2-w/2,y-14,w,27,13.5); ctx.fill();
    ctx.strokeStyle=t.color; ctx.lineWidth=2; ctx.stroke();
    txt(t.text,W/2,y,14,t.color,'center',true);
  });
}

function drawBanner(v){
  if (!v.banner) return;
  const y=HUD_H+170, sc=1+0.05*Math.sin(animT()*9);
  ctx.save(); ctx.translate(W/2,y); ctx.scale(sc,sc);
  ctx.font=`700 28px ${FONT}`;
  const w=ctx.measureText(v.banner).width+56;
  clay(ctx,-w/2,-28,w,56,16,'#3a0d14','#5c1620','#ff5a5f',5);
  txt(v.banner,0,0,28,T.gold,'center',true);
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
