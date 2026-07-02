'use strict';
/* ================================================================
   CHAOS CHEF — web prototype
   Bản rút gọn theo GDD chaos_chef_gdd.md (Kmarj, 2026)
   1 file duy nhất: local co-op + online PeerJS + quay clip
   ================================================================ */

// ---------- Hằng số thế giới ----------
const TILE = 64, GRID_W = 13, GRID_H = 8;
const HUD_H = 150;                       // HUD vẽ thẳng lên canvas để quay clip có đủ thông tin
const W = GRID_W * TILE;                 // 832
const H = HUD_H + GRID_H * TILE;         // 662
const PR = 21;                           // bán kính người chơi
const SPEED = 235;                       // px/giây
const COOK_TIME = 4, CHOP_TIME = 1.3;    // giây
const BURN_AFTER = 8;                    // món chín để quên trên bếp bao lâu thì bốc cháy
const INTERACT_DIST = 92;

// ---------- Nguyên liệu ----------
const ING = {
  mi:     { name:'Mì',      emoji:'🍜', prep:'cook' },
  cachua: { name:'Cà chua', emoji:'🍅', prep:'chop' },
  hanh:   { name:'Hành',    emoji:'🧅', prep:'chop' },
  trung:  { name:'Trứng',   emoji:'🥚', prep:'cook' },
  thit:   { name:'Thịt',    emoji:'🥩', prep:'chop' },
  com:    { name:'Cơm',     emoji:'🍚', prep:'cook' },
};

// ---------- Công thức ----------
const RECIPES = [
  { id:'trung',  name:'Trứng chiên',   emoji:'🍳', ings:['trung'],                reward:1200, time:35 },
  { id:'salad',  name:'Salad cà chua', emoji:'🥗', ings:['cachua','hanh'],        reward:1800, time:45 },
  { id:'mica',   name:'Mì cà chua',    emoji:'🍜', ings:['mi','cachua'],          reward:2200, time:50 },
  { id:'comch',  name:'Cơm chiên',     emoji:'🍛', ings:['com','trung','hanh'],   reward:3200, time:65 },
  { id:'phobo',  name:'Phở bò',        emoji:'🍲', ings:['mi','thit','hanh'],     reward:3600, time:70 },
];

// ---------- Levels ----------
const LEVELS = [
  { name:'Level 1 · Ca Sáng Nhẹ Nhàng', duration:180, target:12000, maxOrders:3, pool:[0,1,2],       eventEvery:[45,70] },
  { name:'Level 2 · Giờ Cao Điểm',      duration:180, target:20000, maxOrders:4, pool:[0,1,2,3],     eventEvery:[32,52] },
  { name:'Level 3 · Đêm Bão Táp',       duration:180, target:30000, maxOrders:5, pool:[0,1,2,3,4],   eventEvery:[22,38] },
];

// ---------- Bố cục bếp (tọa độ ô) ----------
const STATIONS = [
  { type:'crate', ing:'mi',     x:1,  y:0 },
  { type:'crate', ing:'cachua', x:2,  y:0 },
  { type:'crate', ing:'hanh',   x:3,  y:0 },
  { type:'crate', ing:'trung',  x:4,  y:0 },
  { type:'crate', ing:'thit',   x:5,  y:0 },
  { type:'crate', ing:'com',    x:6,  y:0 },
  { type:'switch',              x:8,  y:0 },
  { type:'trash',               x:9,  y:0 },
  { type:'sink',                x:11, y:0 },
  { type:'chop',                x:2,  y:7 },
  { type:'chop',                x:3,  y:7 },
  { type:'stove',               x:5,  y:7 },
  { type:'stove',               x:6,  y:7 },
  { type:'serve',               x:9,  y:7 },
  { type:'serve',               x:10, y:7 },
];
const STOVE_IDX = STATIONS.map((s,i)=>s.type==='stove'?i:-1).filter(i=>i>=0);

// ---------- Nhân vật ----------
const CHARS = [
  { face:'👨‍🍳', color:'#ff5a5f', name:'Sơn'  },
  { face:'👩‍🍳', color:'#ff8fd6', name:'Lan'  },
  { face:'🧑‍🍳', color:'#4fc3f7', name:'Tuấn' },
  { face:'🥸',   color:'#81c784', name:'Huy'  },
];

// ---------- Phím local (4 người 1 bàn phím) ----------
const LOCAL_KEYS = [
  { up:'KeyW',    left:'KeyA',      down:'KeyS',      right:'KeyD',       act:'KeyE'  },
  { up:'ArrowUp', left:'ArrowLeft', down:'ArrowDown', right:'ArrowRight', act:'Enter' },
  { up:'KeyI',    left:'KeyJ',      down:'KeyK',      right:'KeyL',       act:'KeyO'  },
  { up:'KeyT',    left:'KeyF',      down:'KeyG',      right:'KeyH',       act:'KeyY'  },
];

// ---------- Tiện ích ----------
const rand  = (a,b)=> a + Math.random()*(b-a);
const randI = (a,b)=> Math.floor(rand(a,b+1));
const pick  = arr => arr[Math.floor(Math.random()*arr.length)];
const clamp = (v,a,b)=> Math.max(a, Math.min(b,v));
const fmtMoney = n => n.toLocaleString('vi-VN');
const stCX = s => s.x*TILE + TILE/2;   // tâm ô station (tọa độ thế giới)
const stCY = s => s.y*TILE + TILE/2;

function makeCode(){
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let c=''; for(let i=0;i<4;i++) c += A[Math.floor(Math.random()*A.length)];
  return c;
}

// ---------- Âm thanh (WebAudio, không cần file) ----------
let AC = null;
function ac(){ if(!AC) AC = new (window.AudioContext||window.webkitAudioContext)(); return AC; }
function tone(f, d, type='square', v=0.12, delay=0){
  try{
    const a=ac(), o=a.createOscillator(), g=a.createGain();
    o.type=type; o.frequency.value=f; o.connect(g); g.connect(a.destination);
    const t=a.currentTime+delay;
    g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
    o.start(t); o.stop(t+d);
  }catch(e){}
}
const SFX = {
  pick(){  tone(660,.07); },
  place(){ tone(440,.07); },
  ding(){  tone(880,.09); tone(1320,.14,'square',.12,.09); },
  coin(){  tone(988,.07,'triangle',.15); tone(1319,.2,'triangle',.15,.07); },
  buzz(){  tone(150,.28,'sawtooth',.15); },
  alarm(){ tone(220,.3,'sawtooth',.16); tone(220,.3,'sawtooth',.16,.4); },
  spark(){ tone(80,.5,'sawtooth',.2); },
  bell(){  tone(1568,.14,'triangle',.13); },
};

/* ================================================================
   PHẦN 2 — LOGIC GAMEPLAY (chạy trên host / máy local)
   ================================================================ */

let MODE = null;        // 'local' | 'host' | 'client'
let G = null;           // trạng thái game (chỉ host/local có)

function newPlayer(slot, name){
  const c = CHARS[slot];
  return {
    slot, name: name || c.name, face:c.face, color:c.color,
    x: TILE*2 + slot*TILE*2.2, y: TILE*3.5,
    carry:null,               // {ing, st:'raw'|'ready'} | {bucket:true}
    chopEnd:0, stunEnd:0,
    inp:{u:false,d:false,l:false,r:false,a:false}, prevA:false,
  };
}

function newGame(levelIdx, players){
  const L = LEVELS[levelIdx];
  return {
    levelIdx, L, time:0, money:0, over:false,
    players,
    stoves: STOVE_IDX.map(()=>({ item:null, st:null, t:0, fire:false })), // st:'cook'|'ready'
    orders: [],
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
    p.stunEnd = G.time + 8; G.stats.strikes++;
    banner(`😤 ${p.name} ĐÌNH CÔNG 8 GIÂY! Cover gấp!`);
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

function interact(p){
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
          st.fire=false; p.carry=null;
          toast(`💧 ${p.name} dập lửa thành công!`, '#7dff9b');
        } else toast('Cần 💧! Lấy nước ở vòi 🚿!', '#ff7676');
      } else if (st.st==='ready' && !p.carry){
        p.carry = { ing:st.item, st:'ready' };
        st.item=null; st.st=null;
      } else if (!st.item && p.carry && p.carry.ing && p.carry.st==='raw' && ING[p.carry.ing].prep==='cook'){
        st.item=p.carry.ing; st.st='cook'; st.t=G.time; p.carry=null;
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
        p.carry=null; G.stats.trashed++;
        toast(`🗑️ ${p.name} vứt đồ... lãng phí ghê`, '#b8b2c8');
      }
      break;

    case 'switch':
      if (G.blackoutEnd > G.time){
        G.blackoutEnd = 0;
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
      p.carry = null;
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
      if (p.carry && p.carry.ing) p.carry.st='ready';
    }
    const canMove = p.stunEnd <= G.time && !(p.chopEnd > G.time);
    if (canMove){
      let dx=(p.inp.r?1:0)-(p.inp.l?1:0), dy=(p.inp.d?1:0)-(p.inp.u?1:0);
      if (dx||dy){
        const m=Math.hypot(dx,dy);
        p.x = clamp(p.x + dx/m*SPEED*dt, TILE+PR, W-TILE-PR);
        p.y = clamp(p.y + dy/m*SPEED*dt, TILE+PR, GRID_H*TILE-TILE-PR);
      }
    }
    if (p.inp.a && !p.prevA) interact(p);
    p.prevA = p.inp.a;
  }

  // Bếp
  for (const st of G.stoves){
    if (st.fire) continue;
    if (st.st==='cook' && G.time-st.t >= COOK_TIME){ st.st='ready'; st.t=G.time; }
    else if (st.st==='ready' && G.time-st.t >= BURN_AFTER){
      st.fire=true; st.item=null; st.st=null; G.stats.fires++;
      banner('🔥 ĐỂ QUÊN ĐỒ TRÊN BẾP — CHÁY RỒI!!!');
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
    players: G.players.map(p => ({
      x:Math.round(p.x), y:Math.round(p.y), name:p.name, face:p.face, color:p.color,
      carry:p.carry,
      stun: Math.max(0, p.stunEnd - G.time),
      chop: p.chopEnd > G.time ? 1-(p.chopEnd-G.time)/CHOP_TIME : 0,
    })),
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

function makeEndData(){
  return {
    stars: calcStars(), money: G.money, target: G.L.target,
    levelIdx: G.levelIdx, stats: G.stats,
  };
}

/* ================================================================
   PHẦN 3 — MÀN HÌNH, INPUT, MẠNG (PeerJS), VẼ CANVAS, QUAY CLIP
   ================================================================ */

const el  = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function show(id){
  for (const s of ['menu','lobby','gamewrap','endscreen'])
    el(s).classList.toggle('on', s === id);
}

// ---------- Input ----------
const keys = new Set();
const MERGED = {
  up:['KeyW','ArrowUp'], left:['KeyA','ArrowLeft'],
  down:['KeyS','ArrowDown'], right:['KeyD','ArrowRight'],
  act:['KeyE','Space','Enter'],
};
const has = k => Array.isArray(k) ? k.some(c=>keys.has(c)) : keys.has(k);
const readMap = m => ({ u:has(m.up), l:has(m.left), d:has(m.down), r:has(m.right), a:has(m.act) });

let lastSent = '';
function clientSendInput(){
  if (MODE!=='client' || !clientConn || !clientConn.open) return;
  const k = readMap(MERGED), s = JSON.stringify(k);
  if (s !== lastSent){ lastSent = s; clientConn.send({t:'in', k}); }
}
window.addEventListener('keydown', e => {
  if (el('gamewrap').classList.contains('on') &&
      ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter'].includes(e.code))
    e.preventDefault();
  keys.add(e.code); clientSendInput();
});
window.addEventListener('keyup', e => { keys.delete(e.code); clientSendInput(); });
window.addEventListener('blur', () => { keys.clear(); clientSendInput(); });

// ---------- Chọn số người (local) ----------
let selN = 2, localN = 2;
document.querySelectorAll('#localCount .pill').forEach(p => p.onclick = () => {
  document.querySelectorAll('#localCount .pill').forEach(q=>q.classList.remove('sel'));
  p.classList.add('sel'); selN = +p.dataset.n;
});

// ---------- Bắt đầu / chuyển level ----------
let prevView = null;
function playLevel(idx){
  if (MODE === 'client') return;
  let players;
  if (MODE === 'host') players = lobbyPlayers.map((p,i)=>newPlayer(i, p.name));
  else players = Array.from({length: localN}, (_,i)=>newPlayer(i));
  G = newGame(idx, players);
  prevView = null;
  if (MODE === 'host') broadcast({t:'start', level: idx});
  show('gamewrap');
}
function startLocal(){ ac(); MODE='local'; localN=selN; playLevel(0); }
function hostStartGame(lv){ ac(); playLevel(lv-1); }

function finishLevel(){
  const e = makeEndData();
  if (MODE === 'host'){ broadcast({t:'view', v: makeView()}); broadcast({t:'end', e}); }
  if (rec) toggleRec();                 // đang quay clip thì tự lưu luôn
  showEnd(e);
}

// ---------- PeerJS: HOST ----------
let peer=null, conns=[], clientConn=null, roomCode='';
let lobbyPlayers=[], lobbyRemote=[];

function broadcast(m){ for (const c of conns){ try{ c.send(m); }catch(e){} } }
function broadcastLobby(){
  broadcast({t:'lobby', code:roomCode, players: lobbyPlayers.map(p=>({name:p.name}))});
}

function hostRoom(){
  if (typeof Peer === 'undefined'){ el('hostErr').textContent='Không tải được PeerJS — cần có mạng!'; return; }
  const name = (el('hostName').value.trim()||'Chef').slice(0,10);
  el('hostErr').textContent = 'Đang tạo phòng...';
  roomCode = makeCode();
  peer = new Peer('chaoschef-'+roomCode);
  peer.on('open', () => {
    MODE = 'host';
    lobbyPlayers = [{name, conn:null}];
    el('hostErr').textContent = '';
    showLobby(true);
  });
  peer.on('connection', c => {
    c.on('data', d => {
      if (d && d.t === 'join'){
        if (lobbyPlayers.length >= 4 || (G && !G.over)){ c.send({t:'full'}); return; }
        lobbyPlayers.push({ name:String(d.name||'Bạn').slice(0,10), conn:c });
        conns.push(c);
        broadcastLobby();
        if (!G) showLobby(true);
      } else if (d && d.t === 'in'){
        const idx = lobbyPlayers.findIndex(p=>p.conn===c);
        if (G && idx>=0 && G.players[idx]) G.players[idx].inp = d.k;
      }
    });
    c.on('close', () => {
      const idx = lobbyPlayers.findIndex(p=>p.conn===c);
      if (idx > 0){
        lobbyPlayers.splice(idx,1);
        conns = conns.filter(x=>x!==c);
        if (G && G.players[idx]){ G.players.splice(idx,1); toast('Một đồng đội rớt mạng 😢','#ff7676'); }
        broadcastLobby();
        if (!G) showLobby(true);
      }
    });
  });
  peer.on('error', e => {
    el('hostErr').textContent = e.type==='unavailable-id'
      ? 'Mã phòng bị trùng, bấm tạo lại nhé!' : ('Lỗi kết nối: '+e.type);
  });
}

// ---------- PeerJS: CLIENT ----------
let CV=null, CVdisp=null;
function joinRoom(){
  if (typeof Peer === 'undefined'){ el('joinErr').textContent='Không tải được PeerJS — cần có mạng!'; return; }
  const name = (el('joinName').value.trim()||'Bạn').slice(0,10);
  const code = el('joinCode').value.trim().toUpperCase();
  if (code.length !== 4){ el('joinErr').textContent='Mã phòng gồm 4 ký tự!'; return; }
  el('joinErr').textContent = 'Đang kết nối...';
  ac();
  peer = new Peer();
  peer.on('open', () => {
    clientConn = peer.connect('chaoschef-'+code, {reliable:true});
    clientConn.on('open', () => { MODE='client'; clientConn.send({t:'join', name}); });
    clientConn.on('data', onClientData);
    clientConn.on('close', () => {
      if (MODE==='client'){ leaveToMenu(); el('joinErr').textContent='Mất kết nối với chủ phòng 😢'; }
    });
  });
  peer.on('error', e => {
    el('joinErr').textContent = e.type==='peer-unavailable'
      ? 'Không tìm thấy phòng — kiểm tra lại mã!' : ('Lỗi: '+e.type);
  });
}
function onClientData(d){
  if (!d) return;
  if (d.t === 'lobby'){ roomCode=d.code; lobbyRemote=d.players; showLobby(false); }
  else if (d.t === 'start'){ CV=null; CVdisp=null; show('gamewrap'); }
  else if (d.t === 'view'){ playDiffs(CV, d.v); CV = d.v; }
  else if (d.t === 'end'){ showEnd(d.e); }
  else if (d.t === 'full'){ leaveToMenu(); el('joinErr').textContent='Phòng đầy hoặc đang chơi dở 😢'; }
}

function leaveToMenu(){
  try{ if (peer) peer.destroy(); }catch(e){}
  if (rec){ try{ rec.stop(); }catch(e){} }
  peer=null; conns=[]; clientConn=null; lobbyPlayers=[]; lobbyRemote=[];
  G=null; MODE=null; CV=null; CVdisp=null; prevView=null; roomCode='';
  show('menu');
}

// ---------- Lobby / End screens ----------
function showLobby(isHost){
  show('lobby');
  el('lobbyCode').textContent = roomCode;
  const names = isHost ? lobbyPlayers.map(p=>p.name) : lobbyRemote.map(p=>p.name);
  const pl = el('plist'); pl.innerHTML = '';
  for (let i=0;i<4;i++){
    const d = document.createElement('div');
    if (i < names.length){
      d.className = 'pslot';
      d.innerHTML = `<div class="face">${CHARS[i].face}</div><div class="pname" style="color:${CHARS[i].color}">${esc(names[i])}</div>`;
    } else {
      d.className = 'pslot empty';
      d.innerHTML = `<div class="face">💤</div><div class="pname">Trống</div>`;
    }
    pl.appendChild(d);
  }
  el('startBtn').style.display = isHost ? '' : 'none';
  el('lobbyWait').textContent  = isHost ? '' : 'Chờ chủ phòng bắt đầu...';
  el('lobbyHintText').style.display = isHost ? '' : 'none';
}

function addBtn(parent, text, fn, cls){
  const b=document.createElement('button');
  b.textContent=text; if(cls) b.className=cls; b.onclick=fn;
  parent.appendChild(b);
}
function showEnd(e){
  show('endscreen');
  el('endTitle').textContent = e.stars>0 ? (e.stars===3 ? '🎉 XUẤT SẮC!' : '✅ Qua màn!') : '💀 Thất bại rồi...';
  el('endStars').textContent = e.stars>0 ? '⭐'.repeat(e.stars) : '❌';
  el('endMoney').textContent = `💰 ${fmtMoney(e.money)}đ / mục tiêu ${fmtMoney(e.target)}đ`;
  const s = e.stats;
  el('endStats').innerHTML =
    `<div class="stat">✅ ${s.done} đơn xong · ❌ ${s.failed} đơn hỏng · 🗑️ ${s.trashed} món bị vứt</div>`+
    `<div class="stat">🔥 ${s.fires} vụ cháy bếp · ⚡ ${s.blackouts} lần cắt điện · 😤 ${s.strikes} vụ đình công</div>`;
  const b = el('endBtns'); b.innerHTML=''; el('endWait').textContent='';
  if (MODE !== 'client'){
    if (e.stars>0 && e.levelIdx < LEVELS.length-1)
      addBtn(b, '▶ '+LEVELS[e.levelIdx+1].name, ()=>playLevel(e.levelIdx+1));
    addBtn(b, '🔁 Chơi lại', ()=>playLevel(e.levelIdx), 'alt');
    addBtn(b, '🏠 Về menu', leaveToMenu, 'ghost');
  } else {
    el('endWait').textContent = 'Chờ chủ phòng chọn màn tiếp theo...';
    addBtn(b, '🏠 Thoát về menu', leaveToMenu, 'ghost');
  }
}

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
  if (MODE==='client' && v.blackout>0 && prev.blackout<=0) SFX.spark();
}

// ---------- Quay clip (MediaRecorder) ----------
let rec=null, recChunks=[];
function toggleRec(){
  const btn = el('recbtn');
  if (rec){ try{ rec.stop(); }catch(e){} return; }
  if (typeof MediaRecorder === 'undefined'){ alert('Trình duyệt không hỗ trợ quay clip 😢'); return; }
  const stream = cv.captureStream(30);
  let opt = {mimeType:'video/webm;codecs=vp9'};
  if (!MediaRecorder.isTypeSupported(opt.mimeType)) opt = {mimeType:'video/webm'};
  recChunks = [];
  try{ rec = new MediaRecorder(stream,opt); }catch(e){ alert('Trình duyệt không hỗ trợ quay clip 😢'); return; }
  rec.ondataavailable = e => { if (e.data && e.data.size) recChunks.push(e.data); };
  rec.onstop = () => {
    const blob = new Blob(recChunks,{type:'video/webm'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chaos-chef-clip-'+Date.now()+'.webm';
    a.click();
    rec = null;
    btn.textContent='⏺ Quay clip'; btn.classList.add('ghost');
  };
  rec.start(200);
  btn.textContent='⏹ Dừng & Lưu'; btn.classList.remove('ghost');
}

// ---------- Vòng lặp chính ----------
let lastT = performance.now(), sendAcc = 0;
function loop(now){
  requestAnimationFrame(loop);
  const dt = Math.min(0.05,(now-lastT)/1000); lastT = now;

  if ((MODE==='local' || MODE==='host') && G && !G.over){
    if (MODE==='host') G.players[0].inp = readMap(MERGED);
    else for (let i=0;i<G.players.length;i++) G.players[i].inp = readMap(LOCAL_KEYS[i]);
    step(dt);
    if (!G) return;                      // phòng khi finishLevel dọn state
    const v = makeView();
    playDiffs(prevView, v); prevView = v;
    draw(v);
    if (MODE==='host'){
      sendAcc += dt;
      if (sendAcc >= 0.075){ sendAcc = 0; broadcast({t:'view', v}); }
    }
  } else if (MODE==='client' && CV){
    const old = CVdisp;
    CVdisp = JSON.parse(JSON.stringify(CV));
    if (old && old.players){
      for (let i=0;i<CVdisp.players.length && i<old.players.length;i++){
        CVdisp.players[i].x = old.players[i].x + (CV.players[i].x-old.players[i].x)*0.45;
        CVdisp.players[i].y = old.players[i].y + (CV.players[i].y-old.players[i].y)*0.45;
      }
    }
    draw(CVdisp);
  }
}
requestAnimationFrame(loop);