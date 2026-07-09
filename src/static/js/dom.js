'use strict';
// ---------- Tiện ích DOM / chuyển màn hình ----------
const el  = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function show(id){
  for (const s of ['menu','lobby','gamewrap','endscreen'])
    el(s).classList.toggle('on', s === id);
  // Trong ván: khoá cuộn trang, ẩn tiêu đề. Thoát ra thì trả lại như cũ.
  const inGame = id === 'gamewrap';
  document.documentElement.classList.toggle('ingame', inGame);
  document.body.classList.toggle('ingame', inGame);
  el('optionsPanel').classList.remove('on');   // đổi màn thì luôn đóng bảng
  el('optTitle').textContent = '⚙️ Tuỳ chọn';
  paused = false;
}
