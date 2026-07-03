'use strict';
// ---------- Tiện ích DOM / chuyển màn hình ----------
const el  = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function show(id){
  for (const s of ['menu','lobby','gamewrap','endscreen'])
    el(s).classList.toggle('on', s === id);
}
