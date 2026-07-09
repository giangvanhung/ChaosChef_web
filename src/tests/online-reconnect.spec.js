// Test cơ chế phát hiện rớt mạng "âm thầm" (không có sự kiện "close" nào cả —
// đúng như khi điện thoại đổi wifi giữa chừng) qua nhịp ping/lastSeen trong
// network.js, và đảm bảo vào lại phòng sau đó không bị nhân đôi chỗ ngồi.
//
// Lưu ý: để mô phỏng "im lặng" một cách xác định (không phụ thuộc may rủi vào
// thời điểm ping thật tiếp theo tới), mỗi test đều CHẶN nhịp ping thật của
// phía "chết" (clearInterval pingTimer / vô hiệu hoá broadcast) trước khi giả
// lập mốc lastSeen quá cũ — nếu không, ping thật đến ngay sau đó có thể làm
// mốc lastSeen tự làm mới, khiến test chạy chập chờn (flaky).
const { test, expect } = require('@playwright/test');
const { hostRoom, joinRoom, waitClientJoined } = require('./helpers');

test('rớt mạng âm thầm bị host dọn khỏi phòng sau vài giây, không đợi "close"', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const friendCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  const friendPage = await friendCtx.newPage();

  const code = await hostRoom(hostPage, 'Host');
  await joinRoom(friendPage, 'Friend', code);
  await waitClientJoined(friendPage);

  let names = await hostPage.$$eval('#plist .pslot:not(.empty) .pname', els => els.map(e => e.textContent));
  expect(names).toContain('Friend');

  // "Điện thoại" ngưng phát mọi thứ (đổi wifi, mất sóng...) — không có gói
  // đóng kết nối nào bắn ra, và host cũng không còn nhận được ping thật nữa.
  await friendPage.evaluate(() => { if (pingTimer) clearInterval(pingTimer); });
  await hostPage.evaluate(() => {
    const p = lobbyPlayers.find(p => p.name === 'Friend');
    p.lastSeen = Date.now() - 999999;
  });

  const pruned = await hostPage.waitForFunction(
    () => !lobbyPlayers.some(p => p.name === 'Friend'),
    { timeout: 15000 }
  ).then(() => true).catch(() => false);
  expect(pruned).toBe(true);

  names = await hostPage.$$eval('#plist .pslot:not(.empty) .pname', els => els.map(e => e.textContent));
  expect(names).not.toContain('Friend');

  await hostCtx.close(); await friendCtx.close();
});

test('vào lại phòng sau khi bị dọn vì rớt mạng: không bị nhân đôi chỗ ngồi', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const firstCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  const firstPage = await firstCtx.newPage();

  const code = await hostRoom(hostPage, 'Host');
  await joinRoom(firstPage, 'Friend', code);
  await waitClientJoined(firstPage);

  await firstPage.evaluate(() => { if (pingTimer) clearInterval(pingTimer); });
  await hostPage.evaluate(() => {
    const p = lobbyPlayers.find(p => p.name === 'Friend');
    p.lastSeen = Date.now() - 999999;
  });
  await hostPage.waitForFunction(() => !lobbyPlayers.some(p => p.name === 'Friend'), { timeout: 15000 });

  // "điện thoại" có mạng trở lại -> phiên PeerJS mới hoàn toàn, vào lại đúng mã phòng
  const rejoinCtx = await browser.newContext();
  const rejoinPage = await rejoinCtx.newPage();
  await joinRoom(rejoinPage, 'Friend', code);
  await waitClientJoined(rejoinPage);

  const names = await hostPage.$$eval('#plist .pslot:not(.empty) .pname', els => els.map(e => e.textContent));
  expect(names.filter(n => n === 'Friend').length).toBe(1);
  expect(names).toEqual(['Host', 'Friend']);

  await hostCtx.close(); await firstCtx.close(); await rejoinCtx.close();
});

test('người ở giữa rời phòng: những người còn lại giữ nguyên nhân vật ở ván sau', async ({ browser }) => {
  const ctxs = await Promise.all([0, 1, 2].map(() => browser.newContext()));
  const [hostPage, bPage, cPage] = await Promise.all(ctxs.map(c => c.newPage()));

  const code = await hostRoom(hostPage, 'Host');
  await joinRoom(bPage, 'Bee', code);
  await waitClientJoined(bPage);
  await joinRoom(cPage, 'Cee', code);
  await waitClientJoined(cPage);
  await hostPage.waitForFunction(() => lobbyPlayers.length === 3, { timeout: 15000 });

  // Cee ngồi ghế 2 -> nhân vật Tuấn 🧑‍🍳
  const ceeSeat = await hostPage.evaluate(() => lobbyPlayers.find(p => p.name === 'Cee').seat);
  expect(ceeSeat).toBe(2);
  const ceeFace = await hostPage.evaluate(s => CHARS[s].face, ceeSeat);

  // Bee (ghế 1, ở giữa) rời phòng -> mảng dồn lại, Cee tụt xuống chỉ số 1
  await ctxs[1].close();
  await hostPage.waitForFunction(() => lobbyPlayers.length === 2, { timeout: 15000 });
  expect(await hostPage.evaluate(() => lobbyPlayers.findIndex(p => p.name === 'Cee'))).toBe(1);

  // ...nhưng ghế vẫn là 2, nên vào ván mới Cee vẫn đúng nhân vật cũ
  expect(await hostPage.evaluate(() => lobbyPlayers.find(p => p.name === 'Cee').seat)).toBe(2);
  await hostPage.click('button:has-text("Bắt đầu")');
  await hostPage.waitForSelector('#gamewrap.on');
  const faceInGame = await hostPage.evaluate(() => G.players.find(p => p.name === 'Cee').face);
  expect(faceInGame).toBe(ceeFace);

  await ctxs[0].close(); await ctxs[2].close();
});

test('chủ phòng rớt mạng âm thầm: bạn bè tự động quay về menu báo lỗi', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const friendCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  const friendPage = await friendCtx.newPage();

  const code = await hostRoom(hostPage, 'Host');
  await joinRoom(friendPage, 'Friend', code);
  await waitClientJoined(friendPage);

  // Máy chủ phòng "chết lặng": không đóng kết nối, chỉ ngừng phát mọi tín
  // hiệu (kể cả nhịp ping) — y hệt khi máy đó rớt mạng thật sự.
  await hostPage.evaluate(() => { window.broadcast = () => {}; });

  await friendPage.waitForSelector('#menu.on', { timeout: 15000 });
  const err = await friendPage.$eval('#joinErr', e => e.textContent);
  expect(err).toContain('Mất kết nối với chủ phòng');

  await hostCtx.close(); await friendCtx.close();
});
