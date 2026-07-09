'use strict';
/* ================================================================
   CHAOS CHEF — hằng số & dữ liệu tĩnh (nguyên liệu, công thức, level,
   bố cục bếp, nhân vật, phím tắt local) + hàm tiện ích dùng chung.
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

// ---------- Bảng màu dùng chung cho canvas (song song với biến CSS ở base.css) ----------
// Hướng Claymorphism: thân màu đặc + mặt trên sáng hơn + viền tối + đổ bóng.
const T = {
  ink:'#12131f', panel:'#1e2036', line:'#34365a',
  text:'#f5f0e8', dim:'#a49ec0',
  gold:'#ffc53d', money:'#ffd76a',
  good:'#34d399', warn:'#ffb347', bad:'#ff5a5f',
  floorA:'#f2e6d2', floorB:'#e8d9c0', grout:'#d5c3a6',
  wall:'#4a4266', wallTop:'#5d5480',
};

// Trạm: [thân, mặt trên, viền]
const ST_CLAY = {
  crate:  ['#8f6242','#a9764f','#5f3f2a'],
  chop:   ['#5b6478','#727d94','#3b4152'],
  stove:  ['#453f63','#5a527f','#2c2842'],
  sink:   ['#3d6b8a','#4f88ab','#264659'],
  trash:  ['#54546b','#6b6b86','#373746'],
  switch: ['#8a6d1f','#b08c28','#5a4611'],
  serve:  ['#b07d10','#d8a520','#75530a'],
};

// ---------- Nhân vật ----------
// 4 màu tách bạch nhau và tách khỏi cam/hổ phách của HUD lẫn nâu/tím của trạm.
const CHARS = [
  { face:'👨‍🍳', color:'#ff4d4d', name:'Sơn'  },
  { face:'👩‍🍳', color:'#c084fc', name:'Lan'  },
  { face:'🧑‍🍳', color:'#4fc3f7', name:'Tuấn' },
  { face:'🥸',   color:'#22c55e', name:'Huy'  },
];

// ---------- Phím local (4 người 1 bàn phím) ----------
const LOCAL_KEYS = [
  { up:'KeyW',    left:'KeyA',      down:'KeyS',      right:'KeyD',       act:'KeyE',  thr:'KeyQ'   },
  { up:'ArrowUp', left:'ArrowLeft', down:'ArrowDown', right:'ArrowRight', act:'Enter', thr:'Slash'  },
  { up:'KeyI',    left:'KeyJ',      down:'KeyK',      right:'KeyL',       act:'KeyO',  thr:'KeyU'   },
  { up:'KeyT',    left:'KeyF',      down:'KeyG',      right:'KeyH',       act:'KeyY',  thr:'KeyR'   },
];

// 💬 Emote nhanh (phím 1–4)
const EMOTES = ['NHANH LÊN!! 😡', 'AI CẦM CÀ CHUA?! 🍅', 'LỖI TẠI MÀY 👉', 'Xin lỗi nha 🥺'];

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
