'use strict';
/* ================================================================
   CHAOS CHEF — mạng online (PeerJS): tạo/vào phòng, đồng bộ input
   và view giữa host/client, rời phòng.
   ================================================================ */

// ---------- PeerJS: cấu hình ICE (STUN + TURN dự phòng) ----------
// Chỉ STUN thì 2 máy sau NAT đối xứng (mạng 4G, wifi trường/công ty, double-NAT...)
// không mở được kết nối trực tiếp -> kẹt ở "Đang kết nối...". TURN là chặng trung
// chuyển dự phòng khi không đi trực tiếp được. Dùng TURN công cộng miễn phí (Open Relay).
const PEER_OPTS = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'turn:openrelay.metered.ca:80',              username:'openrelayproject', credential:'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443',             username:'openrelayproject', credential:'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username:'openrelayproject', credential:'openrelayproject' },
    ],
  },
};

// Đổi wifi (nhất là trên điện thoại) làm rớt kết nối WebRTC âm thầm — không có
// gói "close" nào bắn ra cả, nên bên kia cứ tưởng vẫn còn người. Phải tự đếm
// nhịp ping để phát hiện im lặng quá lâu thì coi như rớt mạng thật sự.
const PING_INTERVAL_MS = 3000;
const STALE_TIMEOUT_MS = 9000;

// ---------- PeerJS: HOST ----------
let peer=null, conns=[], clientConn=null, roomCode='';
let lobbyPlayers=[], lobbyRemote=[];
let staleCheckTimer=null;

function broadcast(m){ for (const c of conns){ try{ c.send(m); }catch(e){} } }
function broadcastLobby(){
  broadcast({t:'lobby', code:roomCode, players: lobbyPlayers.map(p=>({name:p.name}))});
}

function dropConn(c){
  const idx = lobbyPlayers.findIndex(p=>p.conn===c);
  if (idx > 0){
    lobbyPlayers.splice(idx,1);
    conns = conns.filter(x=>x!==c);
    if (G && G.players[idx]){ G.players.splice(idx,1); toast('Một đồng đội rớt mạng 😢','#ff7676'); }
    broadcastLobby();
    if (!G) showLobby(true);
  }
}

function hostRoom(){
  if (typeof Peer === 'undefined'){ el('hostErr').textContent='Không tải được PeerJS — cần có mạng!'; return; }
  const name = (el('hostName').value.trim()||'Chef').slice(0,10);
  el('hostErr').textContent = 'Đang tạo phòng...';
  roomCode = makeCode();
  peer = new Peer('chaoschef-'+roomCode, PEER_OPTS);
  peer.on('open', () => {
    MODE = 'host';
    lobbyPlayers = [{name, conn:null, lastSeen:Date.now()}];
    el('hostErr').textContent = '';
    showLobby(true);
    if (staleCheckTimer) clearInterval(staleCheckTimer);
    staleCheckTimer = setInterval(() => {
      broadcast({t:'ping'});
      const now = Date.now();
      for (const p of [...lobbyPlayers]){
        if (p.conn && now - (p.lastSeen||now) > STALE_TIMEOUT_MS){
          try{ p.conn.close(); }catch(e){}
          dropConn(p.conn);
        }
      }
    }, PING_INTERVAL_MS);
  });
  peer.on('connection', c => {
    c.on('data', d => {
      if (d && d.t === 'join'){
        if (lobbyPlayers.length >= 4 || (G && !G.over)){ c.send({t:'full'}); return; }
        lobbyPlayers.push({ name:String(d.name||'Bạn').slice(0,10), conn:c, lastSeen:Date.now() });
        conns.push(c);
        broadcastLobby();
        if (!G) showLobby(true);
        return;
      }
      const idx = lobbyPlayers.findIndex(p=>p.conn===c);
      if (idx < 0) return;               // đã bị dọn vì coi như rớt mạng, bỏ qua dữ liệu đến trễ
      lobbyPlayers[idx].lastSeen = Date.now();
      if (d && d.t === 'in'){
        if (G && G.players[idx]) G.players[idx].inp = d.k;
      } else if (d && d.t === 'emote'){
        if (G && G.players[idx])
          G.players[idx].emote = { text: EMOTES[d.n]||'👋', until: G.time+2.5 };
      }
      // d.t === 'ping': chỉ cần cập nhật lastSeen ở trên là đủ
    });
    c.on('close', () => dropConn(c));
  });
  peer.on('error', e => {
    el('hostErr').textContent = e.type==='unavailable-id'
      ? 'Mã phòng bị trùng, bấm tạo lại nhé!' : ('Lỗi kết nối: '+e.type);
  });
}

// ---------- PeerJS: CLIENT ----------
let CV=null, CVdisp=null;
let pingTimer=null, lastHostSeen=0;
function joinRoom(){
  if (typeof Peer === 'undefined'){ el('joinErr').textContent='Không tải được PeerJS — cần có mạng!'; return; }
  const name = (el('joinName').value.trim()||'Bạn').slice(0,10);
  const code = el('joinCode').value.trim().toUpperCase();
  if (code.length !== 4){ el('joinErr').textContent='Mã phòng gồm 4 ký tự!'; return; }
  el('joinErr').textContent = 'Đang kết nối...';
  ac();
  peer = new Peer(PEER_OPTS);
  peer.on('open', () => {
    clientConn = peer.connect('chaoschef-'+code, {reliable:true});
    clientConn.on('open', () => {
      MODE='client'; clientConn.send({t:'join', name}); lastHostSeen = Date.now();
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        if (clientConn && clientConn.open) clientConn.send({t:'ping'});
        // đổi wifi làm rớt kết nối âm thầm, không có gói "close" nào cả —
        // im lặng quá lâu thì tự coi như mất kết nối với chủ phòng.
        if (Date.now() - lastHostSeen > STALE_TIMEOUT_MS){
          leaveToMenu(); el('joinErr').textContent='Mất kết nối với chủ phòng 😢';
        }
      }, PING_INTERVAL_MS);
    });
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
  lastHostSeen = Date.now();
  if (d.t === 'lobby'){ roomCode=d.code; lobbyRemote=d.players; showLobby(false); }
  else if (d.t === 'start'){ CV=null; CVdisp=null; show('gamewrap'); }
  else if (d.t === 'view'){ playDiffs(CV, d.v); CV = d.v; }
  else if (d.t === 'end'){ showEnd(d.e); }
  else if (d.t === 'full'){ leaveToMenu(); el('joinErr').textContent='Phòng đầy hoặc đang chơi dở 😢'; }
  // d.t === 'ping': chỉ cần cập nhật lastHostSeen ở trên là đủ
}

function leaveToMenu(){
  try{ if (peer) peer.destroy(); }catch(e){}
  if (rec){ try{ rec.stop(); }catch(e){} }
  if (staleCheckTimer){ clearInterval(staleCheckTimer); staleCheckTimer=null; }
  if (pingTimer){ clearInterval(pingTimer); pingTimer=null; }
  peer=null; conns=[]; clientConn=null; lobbyPlayers=[]; lobbyRemote=[];
  G=null; MODE=null; CV=null; CVdisp=null; prevView=null; latestView=null; roomCode='';
  show('menu');
}

// Nút "Rời phòng" khi đang chơi
function leaveGame(){
  if (MODE === 'host'){
    if (!confirm('Bạn là CHỦ PHÒNG — thoát là giải tán phòng cho tất cả mọi người. Chắc chưa?')) return;
  } else if (!confirm('Thoát ván đang chơi?')) return;
  // client thoát: đóng kết nối → host tự xóa nhân vật khỏi trận (đã xử lý ở conn.on close)
  leaveToMenu();
}
