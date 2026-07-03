// Test các trường hợp biên khi chơi online: mã sai, phòng đầy, vào giữa ván,
// chủ phòng rời phòng.
const { test, expect } = require('@playwright/test');
const { hostRoom, joinRoom, waitClientJoined, waitJoinError } = require('./helpers');

test('nhập mã phòng không tồn tại báo lỗi "không tìm thấy phòng"', async ({ page }) => {
  await joinRoom(page, 'Solo', 'ZZZZ');
  const err = await waitJoinError(page);
  expect(err).toContain('Không tìm thấy phòng');
});

test('phòng đã đủ 4 người thì người thứ 5 bị từ chối', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  const code = await hostRoom(hostPage, 'Host');

  const friendCtxs = [];
  for (const name of ['P2', 'P3', 'P4']) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await joinRoom(page, name, code);
    await waitClientJoined(page);
    friendCtxs.push(ctx);
  }

  const names = await hostPage.$$eval('#plist .pslot:not(.empty) .pname', els => els.map(e => e.textContent));
  expect(names).toEqual(['Host', 'P2', 'P3', 'P4']);

  const extraCtx = await browser.newContext();
  const extraPage = await extraCtx.newPage();
  await joinRoom(extraPage, 'P5', code);
  const err = await waitJoinError(extraPage);
  expect(err).toContain('Phòng đầy');

  await hostCtx.close();
  await Promise.all(friendCtxs.map(c => c.close()));
  await extraCtx.close();
});

test('vào phòng khi ván đang chơi dở bị từ chối', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const friendCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  const friendPage = await friendCtx.newPage();

  const code = await hostRoom(hostPage, 'Host');
  await joinRoom(friendPage, 'Friend', code);
  await waitClientJoined(friendPage);
  await hostPage.click('button:has-text("Bắt đầu")');
  await hostPage.waitForSelector('#gamewrap.on');

  const lateCtx = await browser.newContext();
  const latePage = await lateCtx.newPage();
  await joinRoom(latePage, 'Trễ', code);
  const err = await waitJoinError(latePage);
  expect(err).toContain('Phòng đầy hoặc đang chơi dở');

  await hostCtx.close(); await friendCtx.close(); await lateCtx.close();
});

test('chủ phòng rời phòng ở màn chờ: bạn bè bị ngắt kết nối và quay về menu', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const friendCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  const friendPage = await friendCtx.newPage();

  const code = await hostRoom(hostPage, 'Host');
  await joinRoom(friendPage, 'Friend', code);
  await waitClientJoined(friendPage);

  await hostPage.click('#lobby button:has-text("Rời phòng")');

  await friendPage.waitForSelector('#menu.on', { timeout: 10000 });
  const err = await friendPage.$eval('#joinErr', e => e.textContent);
  expect(err).toContain('Mất kết nối với chủ phòng');

  await hostCtx.close(); await friendCtx.close();
});
