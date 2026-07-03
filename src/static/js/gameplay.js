'use strict';
/* ================================================================
   CHAOS CHEF — logic gameplay (chạy trên host / máy local): trạng
   thái ván chơi, đơn hàng, sự cố ngẫu nhiên, tương tác trạm, vòng
   lặp mô phỏng step(), đóng gói view để vẽ/gửi mạng, xếp hạng cuối ván.
   ================================================================ */

let MODE = null;        // 'local' | 'host' | 'client'
let G = null;           // trạng thái game (chỉ host/local có)

function newPlayer(slot, name){
  const c = CHARS[slot];
  return {
    slot, name: name || c.name, face:c.face, color:c.color,
    x: TILE*2 + slot*TILE*2.2, y: TILE*3.5,
    carry:null,               // {ing, st:'raw'|'ready'} | {bucket:true}
    chopEnd:0, stunEnd:0, confuseEnd:0, phone:0, emote:null,
    dir:{x:0,y:1}, vx:0, vy:0,
    // chỉ số cá nhân cho bảng xếp hạng cuối ván
    ps:{ served:0, cooked:0, chopped:0, trashed:0, fires:0, douses:0, switches:0, strikes:0, throws:0, bonks:0 },
    inp:{u:false,d:false,l:false,r:false,a:false,t:false}, prevA:false, prevT:false,
  };
}

function newGame(levelIdx, players){
  const L = LEVELS[levelIdx];
  return {
    levelIdx, L, time:0, money:0, over:false,
    players,
    stoves: STOVE_IDX.map(()=>({ item:null, st:null, t:0, fire:false, by:null })), // by = slot người đặt món (để quy tội cháy bếp)
    orders: [],
    projs: [],                // đồ đang bay (ném nhau)
    rat: null,                // 🐀 chuột cướp đồ
    slipEnd: 0,               // 🧼 sàn trơn
    nextOrderAt: 2,
    nextEventAt: rand(L.eventEvery[0], L.eventEvery[1]),
    blackoutEnd: 0,
    banner: null,          // {text, until}
    toasts: [],            // {text, color, until}
    stats: { done:0, failed:0, fires:0, blackouts:0, trashed:0, strikes:0 },
  };
}

function toast(text, color='#ffffff'){
  G.toasts.push({ text, color, until: G.time + 2.6 });
  if (G.toasts.length > 5) G.toasts.shift();
}
function banner(text){ G.banner = { text, until: G.time + 2.6 }; }

// ---------- Đơn hàng ----------
function spawnOrder(vip=false){
  const r = RECIPES[pick(G.L.pool)];
  G.orders.push({
    rid: r.id, name: r.name, emoji: r.emoji,
    ings: r.ings.map(ing => ({ ing, done:false })),
    spawn: G.time,
    deadline: G.time + (vip ? 22 : r.time),
    total: vip ? 22 : r.time,
    reward: vip ? r.reward*2 : r.reward,
    vip,
  });
}

function completeOrder(o){
  const late = G.time - o.deadline;
  let mult = 1, note='';
  if (late > 0 && late <= 5)       { mult=.75; note=' (trễ 🙄)'; }
  else if (late > 5)               { mult=.5;  note=' (trễ quá! 😤)'; }
  const gain = Math.round(o.reward*mult);
  G.money += gain; G.stats.done++;
  toast(`✅ ${o.name} +${fmtMoney(gain)}đ${note}`, '#7dff9b');
  G.orders.splice(G.orders.indexOf(o),1);
}

function failOrder(o, why){
  G.money = Math.max(0, G.money-500); G.stats.failed++;
  toast(`❌ ${o.name} — ${why} (-500đ)`, '#ff7676');
  G.orders.splice(G.orders.indexOf(o),1);
}

// ---------- Sự cố ngẫu nhiên ----------
function triggerEvent(){
  const opts = [];
  if (G.blackoutEnd <= G.time) opts.push('blackout');
  if (G.stoves.some(s=>!s.fire)) opts.push('fire');
  if (G.orders.length <= G.L.maxOrders) opts.push('vip');
  if (G.players.length >= 2 && G.players.some(p=>p.stunEnd<=G.time)) opts.push('strike');
  if (G.players.some(p=>p.confuseEnd<=G.time)) opts.push('confuse');
  if (G.slipEnd <= G.time) opts.push('slip');
  if (!G.rat && G.players.some(p=>p.carry && p.carry.ing)) opts.push('rat');
  if (G.players.some(p=>p.phone<=0 && p.stunEnd<=G.time)) opts.push('phone');
  if (G.players.length >= 2) opts.push('swap');
  if (!opts.length) return;
  const ev = pick(opts);
  if (ev === 'blackout'){
    G.blackoutEnd = G.time + 7; G.stats.blackouts++;
    banner('⚡ CẮT ĐIỆN!!! Tìm công tắc 💡!'); SFX.spark();
  } else if (ev === 'fire'){
    const s = pick(G.stoves.filter(s=>!s.fire));
    s.fire = true; s.item = null; s.st = null; G.stats.fires++;
    banner('🔥 CHÁY BẾP! Lấy 💧 ở vòi nước mau!');
  } else if (ev === 'vip'){
    spawnOrder(true);
    banner('👑 KHÁCH VIP! Tiền x2 nhưng chỉ chờ 22 giây!');
  } else if (ev === 'strike'){
    const p = pick(G.players.filter(p=>p.stunEnd<=G.time));
    p.stunEnd = G.time + 8; G.stats.strikes++; p.ps.strikes++;
    banner(`😤 ${p.name} ĐÌNH CÔNG 8 GIÂY! Cover gấp!`);
  } else if (ev === 'confuse'){
    const p = pick(G.players.filter(p=>p.confuseEnd<=G.time));
    p.confuseEnd = G.time + 6;
    banner(`🌀 ${p.name} BỊ LÚ — PHÍM ĐẢO NGƯỢC 6 GIÂY!`);
  } else if (ev === 'slip'){
    G.slipEnd = G.time + 10;
    banner('🧼 SÀN MỚI LAU — TRƠN NHƯ BÔI MỠ!');
  } else if (ev === 'rat'){
    const victim = pick(G.players.filter(p=>p.carry && p.carry.ing));
    G.rat = { x:victim.x, y:victim.y,
              tx:rand(TILE+20, W-TILE-20), ty:rand(TILE+20, GRID_H*TILE-TILE-20),
              wp:1.5, item:victim.carry, until:G.time+18 };
    victim.carry = null;
    banner(`🐀 CHUỘT CƯỚP ${ING[G.rat.item.ing].name.toUpperCase()} CỦA ${victim.name.toUpperCase()}! ĐUỔI THEO!`);
  } else if (ev === 'phone'){
    const p = pick(G.players.filter(p=>p.phone<=0 && p.stunEnd<=G.time));
    p.phone = 3;
    banner(`📞 SẾP GỌI ${p.name.toUpperCase()}!!! Bấm tương tác 3 lần để dập máy!`);
  } else if (ev === 'swap'){
    const sh = [...G.players].sort(()=>Math.random()-0.5);
    const a=sh[0], b=sh[1];
    const tx=a.x, ty=a.y; a.x=b.x; a.y=b.y; b.x=tx; b.y=ty;
    banner(`🌀 ĐỔI CA ĐỘT XUẤT! ${a.name} ↔ ${b.name}`);
  }
}

// ---------- Tương tác với trạm ----------
function nearestStation(p){
  let best=null, bd=INTERACT_DIST;
  for (const s of STATIONS){
    const d = Math.hypot(stCX(s)-p.x, stCY(s)-p.y);
    if (d < bd){ bd=d; best=s; }
  }
  return best;
}

// 🤾 Ném đồ đang cầm theo hướng đang nhìn
function throwItem(p){
  if (p.stunEnd>G.time || p.chopEnd>G.time || p.phone>0 || !p.carry) return;
  if (p.carry.bucket){ toast(`${p.name}: đừng ném nước, phí lắm! 💧`, '#ffd54a'); return; }
  G.projs.push({
    x:p.x+p.dir.x*(PR+12), y:p.y+p.dir.y*(PR+12),
    vx:p.dir.x*430, vy:p.dir.y*430,
    ing:p.carry.ing, st:p.carry.st, from:p.slot,
  });
  p.carry = null; p.ps.throws++;
}

function interact(p){
  if (p.phone > 0){                     // 📞 đang bị sếp gọi: bấm để từ chối
    p.phone--;
    if (p.phone<=0) toast(`📞 ${p.name} đã dập máy sếp! Tự do!`, '#7dff9b');
    return;
  }
  if (p.stunEnd > G.time || p.chopEnd > G.time) return;
  const s = nearestStation(p);
  if (!s) return;

  switch (s.type){
    case 'crate':
      if (!p.carry){ p.carry = { ing:s.ing, st:'raw' }; }
      else toast(`${p.name}: tay đang bận rồi! 🙌`, '#ffd54a');
      break;

    case 'chop':
      if (p.carry && p.carry.ing && p.carry.st==='raw' && ING[p.carry.ing].prep==='chop'){
        p.chopEnd = G.time + CHOP_TIME;      // đứng chặt, xong tự thành 'ready'
      } else if (p.carry && p.carry.ing && ING[p.carry.ing].prep==='cook'){
        toast(`${ING[p.carry.ing].name} phải NẤU chứ không chặt! 🤦`, '#ffd54a');
      }
      break;

    case 'stove': {
      const st = G.stoves[STOVE_IDX.indexOf(STATIONS.indexOf(s))];
      if (st.fire){
        if (p.carry && p.carry.bucket){
          st.fire=false; p.carry=null; p.ps.douses++;
          toast(`💧 ${p.name} dập lửa thành công!`, '#7dff9b');
        } else toast('Cần 💧! Lấy nước ở vòi 🚿!', '#ff7676');
      } else if (st.st==='ready' && !p.carry){
        p.carry = { ing:st.item, st:'ready' };
        st.item=null; st.st=null; st.by=null; p.ps.cooked++;
      } else if (!st.item && p.carry && p.carry.ing && p.carry.st==='raw' && ING[p.carry.ing].prep==='cook'){
        st.item=p.carry.ing; st.st='cook'; st.t=G.time; st.by=p.slot; p.carry=null;
      } else if (!st.item && p.carry && p.carry.ing && ING[p.carry.ing].prep==='chop'){
        toast(`${ING[p.carry.ing].name} phải CHẶT chứ không nấu! 🤦`, '#ffd54a');
      } else if (st.st==='cook'){
        toast('Chưa chín mà! Kiên nhẫn! ⏳', '#ffd54a');
      }
      break;
    }

    case 'sink':
      if (!p.carry) p.carry = { bucket:true };
      break;

    case 'trash':
      if (p.carry){
        p.carry=null; G.stats.trashed++; p.ps.trashed++;
        toast(`🗑️ ${p.name} vứt đồ... lãng phí ghê`, '#b8b2c8');
      }
      break;

    case 'switch':
      if (G.blackoutEnd > G.time){
        G.blackoutEnd = 0; p.ps.switches++;
        toast(`💡 ${p.name} bật lại đèn! Cứu tinh!`, '#7dff9b');
      }
      break;

    case 'serve': {
      if (!p.carry || !p.carry.ing){ break; }
      if (p.carry.st !== 'ready'){
        toast('Khách không ăn đồ sống đâu! 🤢', '#ff7676'); SFX.buzz();
        break;
      }
      // đơn cần nguyên liệu này: ưu tiên VIP, rồi deadline gần nhất
      const need = G.orders
        .filter(o => o.ings.some(i => !i.done && i.ing === p.carry.ing))
        .sort((a,b) => (b.vip-a.vip) || (a.deadline-b.deadline))[0];
      if (!need){
        toast(`Không đơn nào cần ${ING[p.carry.ing].name}! 😵`, '#ff7676'); SFX.buzz();
        break;
      }
      need.ings.find(i => !i.done && i.ing === p.carry.ing).done = true;
      p.carry = null; p.ps.served++;
      if (need.ings.every(i => i.done)) completeOrder(need);
      break;
    }
  }
}

// ---------- Vòng lặp mô phỏng (host/local) ----------
function step(dt){
  if (!G || G.over) return;
  G.time += dt;

  // Người chơi
  for (const p of G.players){
    // chặt xong?
    if (p.chopEnd && G.time >= p.chopEnd){
      p.chopEnd=0;
      if (p.carry && p.carry.ing){ p.carry.st='ready'; p.ps.chopped++; }
    }
    const canMove = p.stunEnd <= G.time && !(p.chopEnd > G.time) && p.phone <= 0;
    let dx=0, dy=0;
    if (canMove){
      dx=(p.inp.r?1:0)-(p.inp.l?1:0); dy=(p.inp.d?1:0)-(p.inp.u?1:0);
      if (p.confuseEnd > G.time){ dx=-dx; dy=-dy; }   // 🌀 đảo phím
    }
    const mv = Math.hypot(dx,dy)||1;
    const tvx = dx/mv*SPEED, tvy = dy/mv*SPEED;
    if (G.slipEnd > G.time){                          // 🧼 sàn trơn: có quán tính, không phanh được
      p.vx += (tvx-p.vx)*Math.min(1, dt*1.6);
      p.vy += (tvy-p.vy)*Math.min(1, dt*1.6);
    } else { p.vx = tvx; p.vy = tvy; }
    p.x = clamp(p.x + p.vx*dt, TILE+PR, W-TILE-PR);
    p.y = clamp(p.y + p.vy*dt, TILE+PR, GRID_H*TILE-TILE-PR);
    if (dx||dy) p.dir = {x:dx/mv, y:dy/mv};
    if (p.inp.a && !p.prevA) interact(p);
    p.prevA = p.inp.a;
    if (p.inp.t && !p.prevT) throwItem(p);            // 🤾 ném đồ
    p.prevT = p.inp.t;
  }

  // 💥 Va chạm giữa người chơi (húc nhau văng nhẹ)
  for (let i=0;i<G.players.length;i++) for (let j=i+1;j<G.players.length;j++){
    const a=G.players[i], b=G.players[j];
    const d=Math.hypot(a.x-b.x, a.y-b.y);
    if (d>0.01 && d<PR*2){
      const push=(PR*2-d)/2, nx=(a.x-b.x)/d, ny=(a.y-b.y)/d;
      a.x=clamp(a.x+nx*push, TILE+PR, W-TILE-PR); a.y=clamp(a.y+ny*push, TILE+PR, GRID_H*TILE-TILE-PR);
      b.x=clamp(b.x-nx*push, TILE+PR, W-TILE-PR); b.y=clamp(b.y-ny*push, TILE+PR, GRID_H*TILE-TILE-PR);
    }
  }

  // 🤾 Đồ đang bay: bắt dính hoặc ăn vào mặt
  for (const pr of [...G.projs]){
    pr.x += pr.vx*dt; pr.y += pr.vy*dt;
    const hit = G.players.find(q => q.slot!==pr.from && Math.hypot(q.x-pr.x, q.y-pr.y) < PR+8);
    if (hit){
      if (!hit.carry && hit.stunEnd<=G.time){
        hit.carry = {ing:pr.ing, st:pr.st};
        toast(`🙌 ${hit.name} bắt dính ${ING[pr.ing].emoji}!`, '#7dff9b');
      } else {
        hit.stunEnd = Math.max(hit.stunEnd, G.time+0.9);
        const th = G.players.find(q=>q.slot===pr.from);
        if (th) th.ps.bonks++;
        toast(`💥 ${hit.name} ăn nguyên ${ING[pr.ing].emoji} vào mặt!`, '#ffd54a');
      }
      G.projs.splice(G.projs.indexOf(pr),1); continue;
    }
    if (pr.x<TILE+8 || pr.x>W-TILE-8 || pr.y<TILE+8 || pr.y>GRID_H*TILE-TILE-8)
      G.projs.splice(G.projs.indexOf(pr),1);
  }

  // 🐀 Chuột: chạy trốn người chơi, dồn góc mới bắt được
  if (G.rat){
    const r = G.rat;
    r.wp -= dt;
    let nd=1e9, np=null;
    for (const q of G.players){ const d=Math.hypot(q.x-r.x,q.y-r.y); if(d<nd){nd=d;np=q;} }
    if (nd<150 && np){ r.tx = r.x+(r.x-np.x)*2; r.ty = r.y+(r.y-np.y)*2; }
    else if (r.wp<=0 || Math.hypot(r.tx-r.x,r.ty-r.y)<12){
      r.tx=rand(TILE+20,W-TILE-20); r.ty=rand(TILE+20,GRID_H*TILE-TILE-20); r.wp=1.5;
    }
    const dd = Math.hypot(r.tx-r.x, r.ty-r.y)||1;
    r.x = clamp(r.x+(r.tx-r.x)/dd*250*dt, TILE+14, W-TILE-14);
    r.y = clamp(r.y+(r.ty-r.y)/dd*250*dt, TILE+14, GRID_H*TILE-TILE-14);
    const catcher = G.players.find(q => Math.hypot(q.x-r.x, q.y-r.y) < PR+14);
    if (catcher){
      if (r.item && !catcher.carry){
        catcher.carry = r.item;
        toast(`🐀 ${catcher.name} tóm được chuột, lấy lại ${ING[r.item.ing].emoji}!`, '#7dff9b');
      } else toast(`🐀 ${catcher.name} đuổi được chuột đi!`, '#7dff9b');
      G.rat = null;
    } else if (G.time > r.until){
      if (r.item) toast(`🐀 Chuột tha mất ${ING[r.item.ing].emoji} luôn rồi!!`, '#ff7676');
      G.rat = null;
    }
  }

  // Bếp
  for (const st of G.stoves){
    if (st.fire) continue;
    if (st.st==='cook' && G.time-st.t >= COOK_TIME){ st.st='ready'; st.t=G.time; }
    else if (st.st==='ready' && G.time-st.t >= BURN_AFTER){
      st.fire=true; st.item=null; st.st=null; G.stats.fires++;
      const culprit = G.players.find(q=>q.slot===st.by);   // quy tội người đặt món rồi bỏ quên
      if (culprit){ culprit.ps.fires++; banner(`🔥 ${culprit.name} ĐỂ QUÊN ĐỒ TRÊN BẾP — CHÁY RỒI!!!`); }
      else banner('🔥 ĐỂ QUÊN ĐỒ TRÊN BẾP — CHÁY RỒI!!!');
      st.by=null;
    }
  }

  // Đơn hàng: quá hạn 15s (VIP: 4s) thì khách bỏ đi
  for (const o of [...G.orders]){
    const grace = o.vip ? 4 : 15;
    if (G.time > o.deadline + grace) failOrder(o, o.vip ? 'khách VIP nổi giận bỏ đi 👑💢' : 'khách chờ mòn mỏi bỏ về');
  }

  // Sinh đơn mới
  if (G.orders.length < G.L.maxOrders && G.time >= G.nextOrderAt){
    spawnOrder();
    G.nextOrderAt = G.time + rand(6,10);
  }

  // Sự cố
  if (G.time >= G.nextEventAt && G.time > 15){
    triggerEvent();
    G.nextEventAt = G.time + rand(G.L.eventEvery[0], G.L.eventEvery[1]);
  }

  // Hết giờ
  if (G.time >= G.L.duration){
    G.over = true;
    finishLevel();
  }
}

// ---------- Đóng gói trạng thái để vẽ / gửi qua mạng ----------
function makeView(){
  return {
    ln: G.L.name, money: G.money, target: G.L.target,
    tleft: Math.max(0, G.L.duration - G.time),
    blackout: Math.max(0, G.blackoutEnd - G.time),
    slip: Math.max(0, G.slipEnd - G.time),
    players: G.players.map(p => ({
      x:Math.round(p.x), y:Math.round(p.y), name:p.name, face:p.face, color:p.color,
      carry:p.carry,
      stun: Math.max(0, p.stunEnd - G.time),
      chop: p.chopEnd > G.time ? 1-(p.chopEnd-G.time)/CHOP_TIME : 0,
      confuse: p.confuseEnd > G.time,
      phone: p.phone,
      emote: (p.emote && p.emote.until > G.time) ? p.emote.text : null,
    })),
    projs: G.projs.map(q => ({x:Math.round(q.x), y:Math.round(q.y), e:ING[q.ing].emoji})),
    rat: G.rat ? {x:Math.round(G.rat.x), y:Math.round(G.rat.y), e:G.rat.item?ING[G.rat.item.ing].emoji:null} : null,
    stoves: G.stoves.map(s => ({
      fire:s.fire, item:s.item, st:s.st,
      frac: s.st==='cook' ? clamp((G.time-s.t)/COOK_TIME,0,1)
          : s.st==='ready'? clamp((G.time-s.t)/BURN_AFTER,0,1) : 0,
    })),
    orders: G.orders.map(o => ({
      name:o.name, emoji:o.emoji, vip:o.vip, reward:o.reward,
      ings:o.ings.map(i=>({e:ING[i.ing].emoji, d:i.done})),
      rem: o.deadline - G.time, total: o.total,
    })),
    toasts: G.toasts.filter(t=>t.until>G.time).map(t=>({text:t.text,color:t.color})),
    banner: (G.banner && G.banner.until>G.time) ? G.banner.text : null,
    over: G.over,
  };
}

function calcStars(){
  const m=G.money, t=G.L.target;
  if (m >= t)      return 3;
  if (m >= t*0.7)  return 2;
  if (m >= t*0.4)  return 1;
  return 0;
}

// ---------- Xếp hạng cá nhân cuối ván ----------
function pscore(p){
  const s = p.ps;
  return s.served*3 + s.cooked*2 + s.chopped*2 + s.douses*4 + s.switches*3
       - s.trashed*2 - s.fires*4;
}
function titleFor(p, all){
  const s = p.ps;
  const isMax = k => s[k] > 0 && s[k] === Math.max(...all.map(q=>q.ps[k]));
  if (isMax('fires'))    return '🔥 Thần Hỏa Hoạn';
  if (isMax('trashed'))  return '🗑️ Vua Lãng Phí';
  if (isMax('bonks'))    return '🎯 Xạ Thủ Cà Khịa';
  if (isMax('douses'))   return '🧯 Lính Cứu Hỏa';
  if (isMax('strikes'))  return '😤 Chúa Đình Công';
  if (isMax('served'))   return '🛎️ Shipper Chân Chính';
  if (isMax('cooked'))   return '🍳 Vua Đứng Bếp';
  if (isMax('chopped'))  return '🔪 Đồ Tể Rau Củ';
  if (isMax('switches')) return '💡 Người Giữ Ánh Sáng';
  return '🍜 Nhân Viên Gương Mẫu';
}
function makeEndData(){
  const ranked = G.players
    .map(p => ({ name:p.name, face:p.face, color:p.color, ps:p.ps,
                 score:pscore(p), title:titleFor(p, G.players) }))
    .sort((a,b)=>b.score-a.score);
  return {
    stars: calcStars(), money: G.money, target: G.L.target,
    levelIdx: G.levelIdx, stats: G.stats, players: ranked,
  };
}
