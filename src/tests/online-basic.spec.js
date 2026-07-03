// Test luồng online cơ bản qua PeerJS thật (cloud signaling + TURN đã cấu
// hình trong network.js) — 2 tab trình duyệt độc lập đóng vai host/bạn bè.
const { test, expect } = require('@playwright/test');
const { hostRoom, joinRoom, waitClientJoined } = require('./helpers');

test('chủ phòng tạo phòng nhận mã 4 ký tự hợp lệ', async ({ page }) => {
  const code = await hostRoom(page, 'Host');
  expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/);
});

test('bạn bè vào phòng bằng mã: cả 2 phía đều thấy đủ tên trong danh sách chờ', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const friendCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  const friendPage = await friendCtx.newPage();

  const code = await hostRoom(hostPage, 'Host');
  await joinRoom(friendPage, 'Friend', code);
  await waitClientJoined(friendPage);

  const hostSees = await hostPage.$$eval('#plist .pslot:not(.empty) .pname', els => els.map(e => e.textContent));
  const friendSees = await friendPage.$$eval('#plist .pslot:not(.empty) .pname', els => els.map(e => e.textContent));
  expect(hostSees).toEqual(['Host', 'Friend']);
  expect(friendSees).toEqual(['Host', 'Friend']);

  await hostCtx.close(); await friendCtx.close();
});

test('chủ phòng bắt đầu ván: cả 2 vào màn chơi, bạn bè nhận view trực tiếp từ host', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const friendCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  const friendPage = await friendCtx.newPage();

  const code = await hostRoom(hostPage, 'Host');
  await joinRoom(friendPage, 'Friend', code);
  await waitClientJoined(friendPage);

  await hostPage.click('button:has-text("Bắt đầu")');
  await hostPage.waitForSelector('#gamewrap.on');
  await friendPage.waitForSelector('#gamewrap.on');

  const gotView = await friendPage.waitForFunction(
    () => typeof CV !== 'undefined' && CV !== null && CV.players.length === 2,
    { timeout: 10000 }
  ).then(() => true).catch(() => false);
  expect(gotView).toBe(true);

  await hostCtx.close(); await friendCtx.close();
});

test('hết giờ: bạn bè nhận đúng bảng xếp hạng cuối ván do host phát ra', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const friendCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  const friendPage = await friendCtx.newPage();

  const code = await hostRoom(hostPage, 'Host');
  await joinRoom(friendPage, 'Friend', code);
  await waitClientJoined(friendPage);
  await hostPage.click('button:has-text("Bắt đầu")');
  await hostPage.waitForSelector('#gamewrap.on');
  await friendPage.waitForSelector('#gamewrap.on');

  await hostPage.evaluate(() => { G.time = G.L.duration; });
  await hostPage.waitForSelector('#endscreen.on', { timeout: 5000 });
  await friendPage.waitForSelector('#endscreen.on', { timeout: 5000 });

  const hostMoney = await hostPage.$eval('#endMoney', e => e.textContent);
  const friendMoney = await friendPage.$eval('#endMoney', e => e.textContent);
  expect(friendMoney).toBe(hostMoney);

  // client không tự chọn level tiếp theo được, chỉ có nút thoát
  const friendBtns = await friendPage.$$eval('#endBtns button', els => els.map(e => e.textContent));
  expect(friendBtns).toEqual(['🏠 Thoát về menu']);

  await hostCtx.close(); await friendCtx.close();
});
