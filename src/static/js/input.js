'use strict';
/* ================================================================
   CHAOS CHEF — input: bàn phím (local + online), nút cảm ứng mobile,
   chọn số người chơi ở màn hình chung 1 máy.
   ================================================================ */

// ---------- Input ----------
const keys = new Set();
const MERGED = {
  up:['KeyW','ArrowUp'], left:['KeyA','ArrowLeft'],
  down:['KeyS','ArrowDown'], right:['KeyD','ArrowRight'],
  act:['KeyE','Space','Enter'],
  thr:['KeyQ','Slash','ShiftLeft','ShiftRight'],
};
const has = k => Array.isArray(k) ? k.some(c=>keys.has(c)) : keys.has(k);
const readMap = m => ({ u:has(m.up), l:has(m.left), d:has(m.down), r:has(m.right), a:has(m.act), t:has(m.thr) });

let lastSent = '';
function clientSendInput(){
  if (MODE!=='client' || !clientConn || !clientConn.open) return;
  const k = readMap(MERGED), s = JSON.stringify(k);
  if (s !== lastSent){ lastSent = s; clientConn.send({t:'in', k}); }
}
window.addEventListener('keydown', e => {
  // Đang gõ vào ô nhập / kéo thanh trượt thì để yên cho nó, đừng coi là phím game
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const inGame = el('gamewrap').classList.contains('on');
  if (inGame && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter'].includes(e.code))
    e.preventDefault();
  if (inGame && e.code === 'Escape'){ toggleOptions(); return; }
  if (inGame && /^Digit[1-4]$/.test(e.code)){        // 💬 emote nhanh
    const n = +e.code.slice(5)-1;
    if (MODE==='client' && clientConn && clientConn.open) clientConn.send({t:'emote', n});
    else if ((MODE==='host'||MODE==='local') && G && G.players[0])
      G.players[0].emote = { text: EMOTES[n], until: G.time+2.5 };
  }
  keys.add(e.code); clientSendInput();
});
window.addEventListener('keyup', e => { keys.delete(e.code); clientSendInput(); });
window.addEventListener('blur', () => { keys.clear(); clientSendInput(); });

// ---------- Điều khiển cảm ứng (mobile) ----------
// Bấm nút ảo = giữ đúng phím WASD/E/Q (giống P1) nên hoạt động luôn với host lẫn client online.
const MOBILE_KEYS = { up:'KeyW', left:'KeyA', down:'KeyS', right:'KeyD', act:'KeyE', thr:'KeyQ' };
function bindTouchBtn(btn, code){
  const press = ev => { ev.preventDefault(); btn.classList.add('active'); keys.add(code); clientSendInput(); };
  const release = ev => { ev.preventDefault(); btn.classList.remove('active'); keys.delete(code); clientSendInput(); };
  btn.addEventListener('touchstart', press, {passive:false});
  btn.addEventListener('touchend', release, {passive:false});
  btn.addEventListener('touchcancel', release, {passive:false});
  btn.addEventListener('mousedown', press);
  btn.addEventListener('mouseup', release);
  btn.addEventListener('mouseleave', release);
}
document.querySelectorAll('#mobileControls .mbtn').forEach(btn => bindTouchBtn(btn, MOBILE_KEYS[btn.dataset.k]));

// Máy cảm ứng, HOẶC màn hình kiểu điện thoại (kể cả trình duyệt mobile báo
// maxTouchPoints = 0) → tự bật sẵn nút cảm ứng.
const isTouchDevice = () =>
  ('ontouchstart' in window) || navigator.maxTouchPoints > 0 ||
  window.matchMedia('(pointer: coarse)').matches ||
  window.matchMedia('(hover: none)').matches;

function setMobileControls(on){
  el('mobileControls').classList.toggle('on', on);
  el('mobileToggleBtn').textContent = on ? '📱 Ẩn nút cảm ứng' : '📱 Hiện nút cảm ứng';
}
function toggleMobileControls(){ setMobileControls(!el('mobileControls').classList.contains('on')); }
setMobileControls(isTouchDevice());

// ---------- Chỉnh cỡ joystick + nút hành động ----------
// Ghi đè biến --msz bằng inline style (thắng cả @media mặc định) và nhớ lại
// trong localStorage. Không chỉnh gì thì để CSS tự lo theo cỡ màn hình.
const MSZ_KEY = 'chaoschef_mobile_size';
const mszOf = () =>
  Math.round(parseFloat(getComputedStyle(el('mobileControls')).getPropertyValue('--msz'))) || 54;
function syncSizeUI(px){ el('mszVal').textContent = px; el('mszRange').value = px; }
function applyMobileSize(px){
  el('mobileControls').style.setProperty('--msz', px + 'px');
  syncSizeUI(px);
}
function resetMobileSize(){
  el('mobileControls').style.removeProperty('--msz');
  try { localStorage.removeItem(MSZ_KEY); } catch(e){}
  syncSizeUI(mszOf());
}
el('mszRange').addEventListener('input', e => {
  const px = +e.target.value;
  applyMobileSize(px);
  try { localStorage.setItem(MSZ_KEY, px); } catch(err){}
});
(function initMobileSize(){
  let saved = null;
  try { saved = localStorage.getItem(MSZ_KEY); } catch(e){}
  if (saved) applyMobileSize(+saved); else syncSizeUI(mszOf());
})();

// ---------- Chọn số người (local) ----------
let selN = 2, localN = 2;
document.querySelectorAll('#localCount .pill').forEach(p => p.onclick = () => {
  document.querySelectorAll('#localCount .pill').forEach(q=>q.classList.remove('sel'));
  p.classList.add('sel'); selN = +p.dataset.n;
});

// Trên máy cảm ứng, chế độ "chung 1 máy" nhiều người là vô nghĩa: nút cảm ứng
// chỉ gõ đúng bộ phím của P1 (xem MOBILE_KEYS ≡ LOCAL_KEYS[0]), nên P2–P4 sẽ
// đứng chôn chân cả ván. Ép về 1 người và chỉ đường sang phòng online.
//
// Trừ khi mở trang với ?keyboard=1 — lối thoát cho máy tính bảng / laptop cảm
// ứng có cắm bàn phím rời. Trình duyệt không có cách nào tự biết điều đó.
const hasRealKeyboard = new URLSearchParams(location.search).has('keyboard');
if (isTouchDevice() && !hasRealKeyboard){
  selN = 1;
  el('localCountWrap').hidden = true;
  el('localSoloNote').hidden = false;
  el('localTitle').textContent = 'Chơi một mình';
  el('localDesc').textContent = 'Một mình cân cả bếp — vừa sức để làm quen trước khi rủ hội bạn vào.';
}
