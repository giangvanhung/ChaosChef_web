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
  const inGame = el('gamewrap').classList.contains('on');
  if (inGame && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter'].includes(e.code))
    e.preventDefault();
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

const isTouchDevice = () => ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
function toggleMobileControls(){
  const on = el('mobileControls').classList.toggle('on');
  el('mobileToggleBtn').textContent = on ? '📱 Ẩn nút' : '📱 Nút cảm ứng';
}
if (isTouchDevice()){ el('mobileControls').classList.add('on'); el('mobileToggleBtn').textContent = '📱 Ẩn nút'; }

// ---------- Chọn số người (local) ----------
let selN = 2, localN = 2;
document.querySelectorAll('#localCount .pill').forEach(p => p.onclick = () => {
  document.querySelectorAll('#localCount .pill').forEach(q=>q.classList.remove('sel'));
  p.classList.add('sel'); selN = +p.dataset.n;
});
