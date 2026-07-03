'use strict';
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
