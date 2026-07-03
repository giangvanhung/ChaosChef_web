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
// khác nhau chơi thử — xem gợi ý ở cuối HUONG_DAN.md.
//
// HIỆN TRẠNG (đã kiểm chứng lúc viết bộ test này): 2 test dưới đây ĐANG FAIL
// THẬT — không phải lỗi test. Kiểm tra tay bằng RTCPeerConnection thô cho
// thấy server TURN đang cấu hình trong PEER_OPTS (openrelay.metered.ca, cả
// UDP:80 lẫn TCP:443) không trả về relay candidate nào cả (0/0) dù STUN
// thường vẫn hoạt động bình thường từ cùng máy — tức là chặng dự phòng TURN
// coi như không tồn tại trên thực tế. Vụ "thêm TURN" trước đó chỉ được xác
// nhận bằng test 2 tab TRÊN CÙNG 1 MÁY nên luôn đi thẳng qua STUN, chưa bao
// giờ thực sự chạm tới TURN — bài test này là lần đầu ép buộc dùng TURN
// thật và phát hiện ra nó chết. Free TURN công cộng kiểu này rất hay bị
// khai tử/giới hạn traffic theo thời gian nên đây gần như luôn xảy ra sớm
// muộn với bất kỳ dịch vụ miễn phí nào. Để sửa thật sự cần một trong: (1)
// đăng ký TURN free-tier có API key (Metered.ca, Cloudflare Calls, Twilio,
// Xirsys...) rồi đổi iceServers trong network.js, hoặc (2) tự host coturn.
// Cứ để 2 test này ở trạng thái fail — đó là tín hiệu đúng, đừng xoá hay
// nới lỏng điều kiện relay-only để "cho qua".
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
