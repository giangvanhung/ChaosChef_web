// Test "2 người chơi ở 2 mạng khác nhau" (đúng yêu cầu: nhà - 4G, wifi nhà -
// wifi trường/công ty, sau NAT đối xứng ở cả hai đầu...).
//
// GHI CHÚ QUAN TRỌNG VỀ GIỚI HẠN: một máy chạy test tự động không thể tạo ra
// 2 mạng Internet thật khác nhau. Cách mô phỏng trung thực nhất có thể làm
// được là ép RTCPeerConnection chỉ được sinh candidate loại "relay" (ép đi
// qua server TURN), tức chặn hoàn toàn khả năng kết nối P2P trực tiếp — đây
// chính xác là những gì xảy ra khi 2 máy thật ở sau NAT đối xứng / mạng di
// động / wifi trường-công ty chặn UDP P2P: STUN bó tay, phải trông cậy hoàn
// toàn vào chặng TURN relay đã cấu hình trong static/js/network.js
// (PEER_OPTS). Nếu test này pass tức là đường TURN dự phòng thật sự hoạt
// động, không chỉ là "có khai báo cho có".
//
// Muốn xác nhận 100% ngoài đời thật thì vẫn cần 2 thiết bị thật ở 2 mạng
// khác nhau chơi thử — xem gợi ý trong README.md.
//
// HIỆN TRẠNG: 2 test dưới đây FAIL CÓ CHỦ Ý, và sẽ tự pass ngay khi có TURN thật.
// `TURN_SERVERS` trong network.js đang để TRỐNG, vì TURN miễn phí Open Relay đã
// chết: đo lại ngày 09/07/2026 bằng cách gom ICE candidate trong Chromium thì cả
// openrelay.metered.ca (:80, :443, :443?transport=tcp) lẫn staticauth.openrelay…
// đều cho 0 relay candidate, trong khi STUN từ cùng máy vẫn ra srflx bình thường.
//
// Trước đây "thêm TURN" chỉ được xác nhận bằng 2 tab TRÊN CÙNG 1 MÁY — đường đó
// luôn đi thẳng qua STUN nên chưa bao giờ chạm tới TURN. Bài test này là chỗ đầu
// tiên ép buộc dùng TURN và phát hiện nó chết. TURN công cộng miễn phí kiểu này
// sớm muộn gì cũng bị khai tử, nên đừng trông cậy vào cái nào không có API key.
//
// Để 2 test này xanh, cần một trong hai: (1) đăng ký TURN free-tier có API key
// (Metered.ca, Cloudflare Calls, Twilio, Xirsys...) rồi điền vào TURN_SERVERS,
// hoặc (2) tự dựng coturn. ĐỪNG xoá hay nới lỏng điều kiện relay-only để "cho
// qua" — chúng là cảm biến báo chặng dự phòng có thật sự hoạt động hay không.
const { test, expect } = require('@playwright/test');
const { hostRoom, joinRoom, waitClientJoined, forceRelayOnly } = require('./helpers');

test('1 người sau NAT chặt (chỉ TURN relay), người kia mạng bình thường — vẫn ghép phòng và đồng bộ ván chơi', async ({ browser }) => {
  const hostCtx = await browser.newContext();                 // mạng "bình thường"
  const friendCtx = await browser.newContext();
  await forceRelayOnly(friendCtx);                             // mạng "hạn chế" (4G/wifi trường...)

  const hostPage = await hostCtx.newPage();
  const friendPage = await friendCtx.newPage();

  const code = await hostRoom(hostPage, 'Host');
  await joinRoom(friendPage, 'Friend', code);
  await waitClientJoined(friendPage, 30000);

  const names = await hostPage.$$eval('#plist .pslot:not(.empty) .pname', els => els.map(e => e.textContent));
  expect(names).toEqual(['Host', 'Friend']);

  await hostPage.click('button:has-text("Bắt đầu")');
  await hostPage.waitForSelector('#gamewrap.on');
  await friendPage.waitForSelector('#gamewrap.on');

  const synced = await friendPage.waitForFunction(
    () => typeof CV !== 'undefined' && CV !== null && CV.players.length === 2,
    { timeout: 10000 }
  ).then(() => true).catch(() => false);
  expect(synced).toBe(true);

  await hostCtx.close(); await friendCtx.close();
});

test('cả 2 người đều sau NAT đối xứng (chỉ TURN relay cả hai đầu) — vẫn ghép phòng được qua relay', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const friendCtx = await browser.newContext();
  await forceRelayOnly(hostCtx);
  await forceRelayOnly(friendCtx);

  const hostPage = await hostCtx.newPage();
  const friendPage = await friendCtx.newPage();

  const code = await hostRoom(hostPage, 'Host');
  await joinRoom(friendPage, 'Friend', code);
  await waitClientJoined(friendPage, 30000);

  const names = await hostPage.$$eval('#plist .pslot:not(.empty) .pname', els => els.map(e => e.textContent));
  expect(names).toEqual(['Host', 'Friend']);

  // Bằng chứng thêm: xác nhận cặp candidate thắng cuộc thật sự là loại
  // "relay" (đi qua TURN), không lặng lẽ rớt về đường P2P trực tiếp nào khác.
  const candidateInfo = await friendPage.evaluate(async () => {
    if (!clientConn || !clientConn.peerConnection) return null;
    const stats = await clientConn.peerConnection.getStats();
    let pair = null;
    stats.forEach(r => { if (r.type === 'candidate-pair' && r.state === 'succeeded') pair = r; });
    if (!pair) return null;
    const local = stats.get(pair.localCandidateId);
    return local ? local.candidateType : null;
  });
  if (candidateInfo !== null) {
    expect(candidateInfo).toBe('relay');
  }

  await hostCtx.close(); await friendCtx.close();
});
