'use strict';
/* ================================================================
   CHAOS CHEF — mạng online (PeerJS): tạo/vào phòng, đồng bộ input
   và view giữa host/client, rời phòng.
   ================================================================ */

// ---------- PeerJS: cấu hình ICE ----------
const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

// TURN = chặng chuyển tiếp dự phòng khi hai máy không nối thẳng được với nhau
// (NAT đối xứng: mạng 4G, wifi trường/công ty, double-NAT). KHÔNG có TURN thì
// một phần các cặp người chơi sẽ không bao giờ kết nối nổi, dù STUN và signaling
// đều bình thường — và triệu chứng đúng là kẹt ở "Đang kết nối...".
//
// Ô này để TRỐNG vì TURN miễn phí Open Relay đã ngừng hoạt động. Đo bằng cách gom
// ICE candidate trong Chromium (09/07/2026): cả openrelay.metered.ca:80, :443,
// :443?transport=tcp lẫn staticauth.openrelay.metered.ca đều cho 0 relay candidate.
// Giữ chúng lại chỉ tổ bắt trình duyệt chờ hết thời gian rồi mới chịu thua.
//
// Muốn bật lại: đăng ký gói miễn phí ở https://metered.ca (50GB/tháng) hoặc tự dựng
// coturn, rồi điền thông tin vào đây.
const TURN_SERVERS = [
  // { urls:'turn:<host>:80',               username:'<user>', credential:'<pass>' },
  // { urls:'turn:<host>:443?transport=tcp', username:'<user>', credential:'<pass>' },
];

const PEER_OPTS = { config: { iceServers: [...STUN_SERVERS, ...TURN_SERVERS] } };

// Bao lâu thì thôi chờ và báo lỗi, thay vì quay vòng "Đang kết nối..." mãi mãi.
const SIGNAL_TIMEOUT_MS  = 12000;   // xin id từ signaling server
const CONNECT_TIMEOUT_MS = 20000;   // bắt tay WebRTC với chủ phòng

// Lời khuyên kèm theo khi kết nối hỏng — khác nhau tuỳ đã cấu hình TURN hay chưa.
const noTurnHint = () => TURN_SERVERS.length
  ? ' Thử lại, hoặc kiểm tra tường lửa mạng.'
  : ' Nếu hai máy khác mạng (4G, wifi công ty) thì cần TURN server — xem TURN_SERVERS trong network.js.';

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
  broadcast({t:'lobby', code:roomCode, players: lobbyPlayers.map(p=>({name:p.name, seat:p.seat}))});
}

// Ghế = nhân vật (mặt + màu). Gán một lần lúc vào phòng và giữ nguyên qua các
// ván, nếu không thì ai đó rời phòng là cả đám bị dồn ghế và đổi nhân vật ở ván
// sau — đang là Lan 👩‍🍳 tự dưng thành Tuấn 🧑‍🍳.
function freeSeat(){
  const used = new Set(lobbyPlayers.map(p=>p.seat));
  for (let s=0; s<4; s++) if (!used.has(s)) return s;
  return -1;
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

// Huỷ một lần thử kết nối đang dở và báo lỗi ra màn hình. Gọi nhiều lần cũng vô hại.
let connectTimer = null;
function abortConnect(errElId, msg){
  if (!connectTimer) return;              // đã kết nối xong hoặc đã báo lỗi rồi
  clearTimeout(connectTimer); connectTimer = null;
  try{ if (peer) peer.destroy(); }catch(e){}
  peer=null; clientConn=null; conns=[]; MODE=null; roomCode='';
  el(errElId).textContent = msg;
}

function hostRoom(){
  if (typeof Peer === 'undefined'){ el('hostErr').textContent='Không tải được PeerJS — cần có mạng!'; return; }
  const name = (el('hostName').value.trim()||'Chef').slice(0,10);
  el('hostErr').textContent = 'Đang tạo phòng...';
  roomCode = makeCode();
  peer = new Peer('chaoschef-'+roomCode, PEER_OPTS);
  connectTimer = setTimeout(
    () => abortConnect('hostErr', 'Máy chủ ghép phòng không trả lời. Kiểm tra mạng rồi thử lại.'),
    SIGNAL_TIMEOUT_MS);
  peer.on('open', () => {
    clearTimeout(connectTimer); connectTimer = null;
    MODE = 'host';
    lobbyPlayers = [{name, conn:null, seat:0, lastSeen:Date.now()}];
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
        // Đang chơi dở thì không cho vào. Ván xong (G.over) thì mở lại cửa —
        // người rớt mạng / bạn mới vào được luôn và sẽ có mặt ở ván kế tiếp.
        if (lobbyPlayers.length >= 4 || (G && !G.over)){ c.send({t:'full'}); return; }
        const nm = String(d.name||'Bạn').slice(0,10);
        lobbyPlayers.push({ name:nm, conn:c, seat:freeSeat(), lastSeen:Date.now() });
        conns.push(c);
        broadcastLobby();
        if (!G) showLobby(true);
        // đang xem bảng kết quả: đừng rời màn, chỉ báo là có người vừa vào
        else el('endWait').textContent = `🔔 ${nm} vừa vào phòng — sẽ chơi cùng ở ván sau!`;
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
    // Lỗi lúc chưa vào phòng thì phải dọn dẹp; lỗi lẻ tẻ sau đó chỉ cần hiện chữ.
    const msg = e.type==='unavailable-id' ? 'Mã phòng bị trùng, bấm tạo lại nhé!'
              : e.type==='network'        ? 'Mất mạng khi đang tạo phòng.'
              : 'Lỗi kết nối: '+e.type;
    if (connectTimer) abortConnect('hostErr', msg);
    else el('hostErr').textContent = msg;
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

  // Không có mốc dừng thì `clientConn.on('open')` có thể không bao giờ bắn (ICE
  // bắt tay thất bại vẫn im lặng) và người chơi ngồi nhìn "Đang kết nối..." mãi.
  connectTimer = setTimeout(
    () => abortConnect('joinErr', 'Không kết nối được với chủ phòng 😢' + noTurnHint()),
    SIGNAL_TIMEOUT_MS);

  peer.on('open', () => {
    clearTimeout(connectTimer);
    connectTimer = setTimeout(          // đổi sang mốc dài hơn cho chặng bắt tay WebRTC
      () => abortConnect('joinErr', 'Không kết nối được với chủ phòng 😢' + noTurnHint()),
      CONNECT_TIMEOUT_MS);

    clientConn = peer.connect('chaoschef-'+code, {reliable:true});
    clientConn.on('error', () => abortConnect('joinErr', 'Kết nối tới chủ phòng bị lỗi.' + noTurnHint()));
    clientConn.on('open', () => {
      clearTimeout(connectTimer); connectTimer = null;
      el('joinErr').textContent = '';
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
    const msg = e.type==='peer-unavailable' ? 'Không tìm thấy phòng — kiểm tra lại mã!'
              : e.type==='network'          ? 'Mất mạng khi đang vào phòng.'
              : 'Lỗi: '+e.type;
    if (connectTimer) abortConnect('joinErr', msg);
    else el('joinErr').textContent = msg;
  });
  // Rớt kết nối tới signaling server (không phải tới chủ phòng) — nối lại được.
  peer.on('disconnected', () => { if (MODE==='client'){ try{ peer.reconnect(); }catch(e){} } });
}
function onClientData(d){
  if (!d) return;
  lastHostSeen = Date.now();
  if (d.t === 'lobby'){
    roomCode=d.code; lobbyRemote=d.players;
    // Mình đang xem bảng kết quả mà có người mới vào phòng thì cứ xem tiếp,
    // đừng bị kéo ngược về phòng chờ.
    if (!el('endscreen').classList.contains('on')) showLobby(false);
  }
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
  if (connectTimer){ clearTimeout(connectTimer); connectTimer=null; }
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
