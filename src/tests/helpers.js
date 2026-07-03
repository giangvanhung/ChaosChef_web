// Tiện ích dùng chung cho các file test — điều hướng màn hình, tạo/vào phòng,
// và mô phỏng "mạng khác nhau" bằng cách ép WebRTC chỉ được dùng chặng TURN
// relay (xem tests/online-cross-network.spec.js để biết lý do).
'use strict';

async function gotoMenu(page) {
  await page.goto('/index.html');
  await page.waitForSelector('#menu.on');
}

async function startLocalGame(page, n) {
  await gotoMenu(page);
  await page.click(`#localCount .pill[data-n="${n}"]`);
  await page.click('button:has-text("Vào bếp ngay!")');
  await page.waitForSelector('#gamewrap.on');
}

async function hostRoom(page, name) {
  await gotoMenu(page);
  await page.fill('#hostName', name);
  await page.click('button:has-text("Tạo phòng")');
  await page.waitForSelector('#lobby.on', { timeout: 30000 });
  return (await page.$eval('#lobbyCode', el => el.textContent)).trim();
}

async function joinRoom(page, name, code) {
  await gotoMenu(page);
  await page.fill('#joinName', name);
  await page.fill('#joinCode', code);
  await page.click('button:has-text("Vào phòng")');
}

async function waitClientJoined(page, timeout = 30000) {
  await page.waitForFunction(
    () => typeof MODE !== 'undefined' && MODE === 'client',
    { timeout }
  );
}

// Chờ ô nhập mã báo lỗi thật sự (khác placeholder "Đang kết nối...")
async function waitJoinError(page, timeout = 30000) {
  return page.waitForFunction(() => {
    const t = document.getElementById('joinErr').textContent;
    return (t && t !== 'Đang kết nối...') ? t : false;
  }, { timeout }).then(h => h.jsonValue());
}

// Ép RTCPeerConnection của context này chỉ được sinh/dùng candidate loại
// "relay" (đi qua server TURN) — không cho phép kết nối P2P trực tiếp dù có
// STUN. Đây là cách mô phỏng trung thực nhất trong môi trường test tự động
// (1 máy, 1 mạng) cho tình huống 2 người chơi thật đứng sau NAT đối xứng /
// mạng di động / wifi trường-công ty ở hai nơi khác nhau — chính là lúc STUN
// bó tay và phải trông cậy vào TURN relay dự phòng đã cấu hình trong
// static/js/network.js (PEER_OPTS).
async function forceRelayOnly(context) {
  await context.addInitScript(() => {
    const Orig = window.RTCPeerConnection;
    function Wrapped(config, constraints) {
      const cfg = Object.assign({}, config, { iceTransportPolicy: 'relay' });
      return new Orig(cfg, constraints);
    }
    Wrapped.prototype = Orig.prototype;
    window.RTCPeerConnection = Wrapped;
  });
}

module.exports = {
  gotoMenu, startLocalGame, hostRoom, joinRoom, waitClientJoined, waitJoinError, forceRelayOnly,
};
