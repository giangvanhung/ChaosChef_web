// Test chế độ chơi "chung 1 máy" (local co-op) và logic gameplay lõi:
// sơ chế/nấu/giao hàng, ném-bắt đồ, hết giờ -> bảng xếp hạng -> chơi lại.
const { test, expect } = require('@playwright/test');
const { startLocalGame } = require('./helpers');

test('1 người: vào bếp ngay tạo đúng 1 nhân vật, MODE=local', async ({ page }) => {
  await startLocalGame(page, 1);
  const info = await page.evaluate(() => ({ mode: MODE, n: G.players.length }));
  expect(info.mode).toBe('local');
  expect(info.n).toBe(1);
});

test('2 người: P1 (WASD) và P2 (mũi tên) di chuyển độc lập, không chéo phím', async ({ page }) => {
  await startLocalGame(page, 2);
  const before = await page.evaluate(() => G.players.map(p => ({ x: p.x, y: p.y })));

  await page.keyboard.down('KeyD');       // P1 sang phải
  await page.keyboard.down('ArrowLeft');  // P2 sang trái
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(100);

  const after = await page.evaluate(() => G.players.map(p => ({ x: p.x, y: p.y })));
  expect(after[0].x).toBeGreaterThan(before[0].x);   // P1 di chuyển phải
  expect(after[1].x).toBeLessThan(before[1].x);      // P2 di chuyển trái (không bị đảo phím)
});

test('4 người: đủ 4 nhân vật, phím riêng của P4 (T F G H) chỉ điều khiển P4', async ({ page }) => {
  await startLocalGame(page, 4);
  const n = await page.evaluate(() => G.players.length);
  expect(n).toBe(4);

  const before = await page.evaluate(() => G.players.map(p => p.x));
  await page.keyboard.down('KeyH');   // phím "phải" của P4
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyH');
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => G.players.map(p => p.x));

  expect(after[3]).toBeGreaterThan(before[3]);        // P4 di chuyển
  expect(after[0]).toBeCloseTo(before[0], 0);          // P1..P3 đứng yên
  expect(after[1]).toBeCloseTo(before[1], 0);
  expect(after[2]).toBeCloseTo(before[2], 0);
});

test('sơ chế (nấu) + giao đúng đơn hàng -> cộng tiền, đơn biến mất khỏi danh sách', async ({ page }) => {
  await startLocalGame(page, 1);

  const result = await page.evaluate(() => {
    const p = G.players[0];
    G.money = 0;
    G.nextOrderAt = Infinity;   // tắt tự sinh đơn ngẫu nhiên để test tất định
    G.orders = [{
      rid: 'trung', name: 'Trứng chiên', emoji: '🍳',
      ings: [{ ing: 'trung', done: false }],
      spawn: G.time, deadline: G.time + 999, total: 999, reward: 1200, vip: false,
    }];

    // Lấy nguyên liệu ở thùng trứng
    const crate = STATIONS.find(s => s.type === 'crate' && s.ing === 'trung');
    p.x = stCX(crate); p.y = stCY(crate);
    interact(p);
    const gotRaw = JSON.parse(JSON.stringify(p.carry));

    // Nấu ở bếp
    const stove = STATIONS.find(s => s.type === 'stove');
    p.x = stCX(stove); p.y = stCY(stove);
    interact(p);
    const stoveIdx = STOVE_IDX.indexOf(STATIONS.indexOf(stove));
    const placedOnStove = JSON.parse(JSON.stringify(G.stoves[stoveIdx]));

    // Chờ chín
    G.time += COOK_TIME + 0.1;
    step(0);
    const readyState = G.stoves[stoveIdx].st;

    // Lấy đồ đã chín
    interact(p);
    const gotReady = JSON.parse(JSON.stringify(p.carry));

    // Giao hàng
    const serve = STATIONS.find(s => s.type === 'serve');
    p.x = stCX(serve); p.y = stCY(serve);
    interact(p);

    return { gotRaw, placedOnStove, readyState, gotReady, money: G.money, ordersLeft: G.orders.length, done: G.stats.done };
  });

  expect(result.gotRaw).toEqual({ ing: 'trung', st: 'raw' });
  expect(result.placedOnStove.item).toBe('trung');
  expect(result.placedOnStove.st).toBe('cook');
  expect(result.readyState).toBe('ready');
  expect(result.gotReady).toEqual({ ing: 'trung', st: 'ready' });
  expect(result.money).toBe(1200);
  expect(result.ordersLeft).toBe(0);
  expect(result.done).toBe(1);
});

test('ném đồ: đồng đội đứng gần, tay không thì bắt dính nguyên liệu', async ({ page }) => {
  await startLocalGame(page, 2);

  const result = await page.evaluate(() => {
    const [p1, p2] = G.players;
    p1.carry = { ing: 'cachua', st: 'raw' };
    p1.dir = { x: 1, y: 0 };
    p2.carry = null;
    p2.x = p1.x + 45; p2.y = p1.y;

    throwItem(p1);
    const projAfterThrow = G.projs.length;
    for (let i = 0; i < 10 && !p2.carry; i++) step(0.02);

    return { projAfterThrow, p1Carry: p1.carry, p2Carry: p2.carry, projsLeft: G.projs.length };
  });

  expect(result.projAfterThrow).toBe(1);
  expect(result.p1Carry).toBeNull();               // đã ném đi, tay trống
  expect(result.p2Carry).toEqual({ ing: 'cachua', st: 'raw' }); // bắt dính
  expect(result.projsLeft).toBe(0);
});

test('ném trúng người đang cầm đồ: bị choáng (stun) thay vì bắt được', async ({ page }) => {
  await startLocalGame(page, 2);

  const result = await page.evaluate(() => {
    const [p1, p2] = G.players;
    p1.carry = { ing: 'cachua', st: 'raw' };
    p1.dir = { x: 1, y: 0 };
    p2.carry = { ing: 'hanh', st: 'raw' };   // P2 đang bận tay
    p2.x = p1.x + 45; p2.y = p1.y;

    throwItem(p1);
    for (let i = 0; i < 10 && G.projs.length; i++) step(0.02);

    return { p2Carry: p2.carry, p2Bonked: p2.stunEnd > G.time, bonks: G.players[0].ps.bonks };
  });

  expect(result.p2Carry).toEqual({ ing: 'hanh', st: 'raw' }); // vẫn cầm đồ cũ, không đổi
  expect(result.p2Bonked).toBe(true);
  expect(result.bonks).toBe(1);
});

test('hết giờ: hiện bảng xếp hạng, bấm "Chơi lại" quay về đúng level vừa chơi', async ({ page }) => {
  await startLocalGame(page, 1);
  const levelIdx = await page.evaluate(() => G.levelIdx);

  await page.evaluate(() => { G.time = G.L.duration; step(0); });
  await page.waitForSelector('#endscreen.on', { timeout: 5000 });
  const rankRows = await page.locator('#endRank .rankrow').count();
  expect(rankRows).toBe(1);

  await page.click('button:has-text("Chơi lại")');
  await page.waitForSelector('#gamewrap.on', { timeout: 5000 });
  const newLevelIdx = await page.evaluate(() => G.levelIdx);
  expect(newLevelIdx).toBe(levelIdx);
});
