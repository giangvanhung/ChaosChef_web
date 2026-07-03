// Test nút điều khiển cảm ứng (D-pad + hành động/ném) và nút bật/tắt.
const { test, expect } = require('@playwright/test');
const { startLocalGame } = require('./helpers');

test.describe('thiết bị cảm ứng (điện thoại)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('vào ván chơi thì nút cảm ứng tự hiện sẵn', async ({ page }) => {
    await startLocalGame(page, 1);
    const on = await page.$eval('#mobileControls', el => el.classList.contains('on'));
    expect(on).toBe(true);
  });

  test('giữ nút ▶ (phải) di chuyển nhân vật, nhả ra thì dừng lại', async ({ page }) => {
    await startLocalGame(page, 1);
    const before = await page.evaluate(() => G.players[0].x);

    await page.evaluate(() => document.querySelector('.mbtn.mright')
      .dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true })));
    await page.waitForTimeout(400);
    const mid = await page.evaluate(() => G.players[0].x);

    await page.evaluate(() => document.querySelector('.mbtn.mright')
      .dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true })));
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => G.players[0].x);

    expect(mid).toBeGreaterThan(before);   // di chuyển khi giữ
    expect(after).toBeCloseTo(mid, 0);     // dừng lại sau khi nhả
  });

  test('nút ✋ (hành động): đứng cạnh thùng nguyên liệu thì nhặt được đồ', async ({ page }) => {
    await startLocalGame(page, 1);
    await page.evaluate(() => {
      const crate = STATIONS.find(s => s.type === 'crate' && s.ing === 'hanh');
      G.players[0].x = stCX(crate); G.players[0].y = stCY(crate);
    });

    await page.evaluate(() => document.querySelector('.mbtn.mact')
      .dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true })));
    await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelector('.mbtn.mact')
      .dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true })));

    const carry = await page.evaluate(() => G.players[0].carry);
    expect(carry).toEqual({ ing: 'hanh', st: 'raw' });
  });
});

test.describe('máy tính (không cảm ứng)', () => {
  test('nút cảm ứng ẩn mặc định; bấm "Nút cảm ứng" để hiện/ẩn', async ({ page }) => {
    await startLocalGame(page, 1);
    let on = await page.$eval('#mobileControls', el => el.classList.contains('on'));
    expect(on).toBe(false);

    await page.click('#mobileToggleBtn');
    on = await page.$eval('#mobileControls', el => el.classList.contains('on'));
    expect(on).toBe(true);
    await expect(page.locator('#mobileToggleBtn')).toHaveText('📱 Ẩn nút');

    await page.click('#mobileToggleBtn');
    on = await page.$eval('#mobileControls', el => el.classList.contains('on'));
    expect(on).toBe(false);
    await expect(page.locator('#mobileToggleBtn')).toHaveText('📱 Nút cảm ứng');
  });
});
