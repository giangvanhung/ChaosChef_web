'use strict';
/* ================================================================
   CHAOS CHEF — điều phối màn hình (lobby/end), bắt đầu/chuyển level,
   quay clip, và vòng lặp chính (mô phỏng + vẽ).
   ================================================================ */

// ---------- Bắt đầu / chuyển level ----------
let prevView = null;
function playLevel(idx){
  if (MODE === 'client') return;
  let players;
  if (MODE === 'host') players = lobbyPlayers.map((p,i)=>newPlayer(i, p.name));
  else players = Array.from({length: localN}, (_,i)=>newPlayer(i));
  G = newGame(idx, players);
  prevView = null; latestView = null; simT = performance.now();
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
  // bảng xếp hạng "ai gánh, ai phá"
  const medals = ['🥇','🥈','🥉','🍀'];
  el('endRank').innerHTML = (e.players||[]).map((p,i)=>{
    const s=p.ps;
    return `<div class="rankrow${i===0?' top':''}${i===e.players.length-1&&e.players.length>1?' bot':''}">`+
      `<span class="rmedal">${medals[i]||''}</span><span class="rface">${p.face}</span>`+
      `<span class="rname" style="color:${p.color}">${esc(p.name)}</span>`+
      `<span class="rtitle">${p.title}</span>`+
      `<span class="rstats">🛎️${s.served} 🍳${s.cooked} 🔪${s.chopped} 🗑️${s.trashed} 🔥${s.fires}</span>`+
      `<span class="rscore">${p.score}đ</span></div>`;
  }).join('');
  if (e.players && e.players.length>1) el('endRank').lastElementChild.querySelector('.rmedal').textContent='🐢';
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
// LƯU Ý: mô phỏng chạy bằng setInterval chứ KHÔNG dùng rAF, vì trình duyệt
// tạm dừng requestAnimationFrame khi tab bị ẩn → nếu dùng rAF, chủ phòng mở
// 2 tab test online sẽ bị: chuyển sang tab kia là tab host đứng hình,
// người chơi 2 gửi input mà không ai xử lý. Tab có WebRTC không bị throttle.
let latestView = null, simT = performance.now(), sendAcc = 0;
setInterval(() => {
  if (!((MODE==='local' || MODE==='host') && G && !G.over)){ simT = performance.now(); return; }
  const now = performance.now();
  const dt = Math.min(0.1,(now-simT)/1000); simT = now;
  if (MODE==='host') G.players[0].inp = readMap(MERGED);
  else for (let i=0;i<G.players.length;i++) G.players[i].inp = readMap(LOCAL_KEYS[i]);
  step(dt);
  if (!G) return;                        // phòng khi finishLevel dọn state
  const v = makeView();
  playDiffs(prevView, v); prevView = v; latestView = v;
  if (MODE==='host'){
    sendAcc += dt;
    if (sendAcc >= 0.07){ sendAcc = 0; broadcast({t:'view', v}); }
  }
}, 33);

function loop(){
  requestAnimationFrame(loop);          // rAF giờ CHỈ vẽ, không mô phỏng
  if ((MODE==='local' || MODE==='host') && G && latestView){
    draw(latestView);
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
