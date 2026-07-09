// Test nút điều khiển cảm ứng (D-pad + hành động/ném) và nút bật/tắt.
const { test, expect } = require('@playwright/test');
const { startLocalGame, gotoMenu } = require('./helpers');

test.describe('thiết bị cảm ứng (điện thoại)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('vào ván chơi thì nút cảm ứng tự hiện sẵn', async ({ page }) => {
    await startLocalGame(page, 1);
    const on = await page.$eval('#mobileControls', el => el.classList.contains('on'));
    expect(on).toBe(true);
  });

  test('ẩn ô chọn số người, ép chơi 1 mình và chỉ đường sang phòng online', async ({ page }) => {
    await gotoMenu(page);
    await expect(page.locator('#localCountWrap')).toBeHidden();
    await expect(page.locator('#localSoloNote')).toBeVisible();
    await expect(page.locator('#localTitle')).toHaveText('Chơi một mình');

    await page.click('button:has-text("Vào bếp ngay!")');
    await page.waitForSelector('#gamewrap.on');
    expect(await page.evaluate(() => G.players.length)).toBe(1);
  });

  test('?keyboard=1 mở khoá lại chế độ nhiều người (máy tính bảng cắm bàn phím rời)', async ({ page }) => {
    await page.goto('/index.html?keyboard=1');
    await page.waitForSelector('#menu.on');
    await expect(page.locator('#localCountWrap')).toBeVisible();
    await expect(page.locator('#localSoloNote')).toBeHidden();

    await page.click('#localCount .pill[data-n="3"]');
    await page.click('button:has-text("Vào bếp ngay!")');
    await page.waitForSelector('#gamewrap.on');
    expect(await page.evaluate(() => G.players.length)).toBe(3);
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

    // Đo vận tốc SAU khi nhả (hai mẫu liên tiếp), đừng so với `mid`: giữa lúc
    // đọc `mid` và lúc gửi touchend còn một chuyến evaluate, nhân vật kịp chạy
    // thêm vài pixel — so với `mid` là test tự hỏng dù game đúng.
    await page.waitForTimeout(150);
    const a1 = await page.evaluate(() => G.players[0].x);
    await page.waitForTimeout(150);
    const a2 = await page.evaluate(() => G.players[0].x);

    expect(mid).toBeGreaterThan(before);   // di chuyển khi giữ
    expect(a2).toBeCloseTo(a1, 1);         // đã đứng hẳn sau khi nhả
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
  test('nút cảm ứng ẩn mặc định; trong bảng ⚙️ bấm để hiện/ẩn', async ({ page }) => {
    await startLocalGame(page, 1);
    let on = await page.$eval('#mobileControls', el => el.classList.contains('on'));
    expect(on).toBe(false);

    await page.click('#optbtn');
    await expect(page.locator('#optionsPanel')).toHaveClass(/on/);

    await page.click('#mobileToggleBtn');
    on = await page.$eval('#mobileControls', el => el.classList.contains('on'));
    expect(on).toBe(true);
    await expect(page.locator('#mobileToggleBtn')).toHaveText('📱 Ẩn nút cảm ứng');

    await page.click('#mobileToggleBtn');
    on = await page.$eval('#mobileControls', el => el.classList.contains('on'));
    expect(on).toBe(false);
    await expect(page.locator('#mobileToggleBtn')).toHaveText('📱 Hiện nút cảm ứng');
  });
});

test.describe('giao diện trong ván', () => {
  test('vào ván thì ẩn tiêu đề, khoá cuộn trang; bảng ⚙️ mở/đóng được', async ({ page }) => {
    await startLocalGame(page, 1);
    await expect(page.locator('#brand')).toBeHidden();
    await expect(page.locator('body')).toHaveClass(/ingame/);
    const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
    expect(overflow).toBe('hidden');

    await expect(page.locator('#optionsPanel')).toBeHidden();
    await page.click('#optbtn');
    await expect(page.locator('#optionsPanel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#optionsPanel')).toBeHidden();
  });

  test('ván 1 máy: mở bảng ⚙️ là tạm dừng, đóng lại thì chạy tiếp', async ({ page }) => {
    await startLocalGame(page, 1);

    await page.click('#optbtn');
    await expect(page.locator('#optTitle')).toHaveText('⏸ Tạm dừng');
    const t1 = await page.evaluate(() => G.time);
    await page.waitForTimeout(500);
    const t2 = await page.evaluate(() => G.time);
    expect(t2).toBe(t1);                      // đồng hồ ván đứng yên

    await page.click('#optbtn');              // đóng bảng
    await page.waitForTimeout(300);
    const t3 = await page.evaluate(() => G.time);
    expect(t3).not.toBe(t1);                  // chạy tiếp
  });

  test('kéo thanh chỉnh cỡ thì joystick to/nhỏ theo và nhớ lại sau khi tải lại', async ({ page }) => {
    await startLocalGame(page, 1);
    await page.click('#optbtn');
    await page.click('#mobileToggleBtn');     // hiện nút cảm ứng để đo được cỡ thật

    await page.locator('#mszRange').fill('80');   // fill() tự bắn sự kiện input
    await expect(page.locator('#mszVal')).toHaveText('80');
    expect(await page.$eval('.mbtn.mup', e => getComputedStyle(e).width)).toBe('80px');

    await startLocalGame(page, 1);            // tải lại trang: phải nhớ cỡ 80px
    await page.click('#optbtn');
    await page.click('#mobileToggleBtn');
    expect(await page.$eval('.mbtn.mup', e => getComputedStyle(e).width)).toBe('80px');

    await page.click('button:has-text("Cỡ mặc định")');
    expect(await page.$eval('.mbtn.mup', e => getComputedStyle(e).width)).toBe('54px');
  });
});
