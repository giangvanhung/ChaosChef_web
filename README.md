# Chaos Chef 🍳

> "Hợp tác, hoảng loạn, cười tím mặt."

Game nấu ăn hỗn loạn 2–4 người kiểu Overcooked, chạy thẳng trên trình duyệt. Không cần cài gì, không cần thuê server — chơi online bằng WebRTC nối máy với máy.

Bản chơi thử rút gọn từ [`chaos_chef_gdd.md`](chaos_chef_gdd.md).

---

## Chạy game

Mở `src/index.html` bằng Chrome/Edge — double-click là được.

Cần có mạng, vì trang tải PeerJS (thư viện WebRTC) và font Fredoka/Nunito từ CDN. Không có mạng thì chế độ chung 1 máy vẫn chạy, chỉ là chữ rơi về font hệ thống và nút "Tạo phòng" báo lỗi.

## Điều khiển

**🛋️ Chung 1 máy** — chọn số người ở menu rồi bấm "Vào bếp ngay!".

| Người chơi | Di chuyển | Tương tác | Ném đồ 🤾 |
|---|---|---|---|
| P1 · Sơn 👨‍🍳 | `W` `A` `S` `D` | `E` | `Q` |
| P2 · Lan 👩‍🍳 | `←` `↑` `↓` `→` | `Enter` | `/` |
| P3 · Tuấn 🧑‍🍳 | `I` `J` `K` `L` | `O` | `U` |
| P4 · Huy 🥸 | `T` `F` `G` `H` | `Y` | `R` |

**🌐 Online** — dùng `W A S D` hoặc phím mũi tên, tương tác `E`/`Space`, ném đồ `Q`/`Shift`.

Chung cho mọi chế độ: phím `1`–`4` bắn emote ("NHANH LÊN!! 😡", "LỖI TẠI MÀY 👉"...), phím `Esc` mở bảng ⚙️ Tuỳ chọn.

**🌗 Sáng / tối** — nút ☀️/🌙 góc trên phải đổi giao diện sáng-tối. Mặc định chạy theo cài đặt hệ thống, và nhớ lựa chọn của bạn cho lần sau. Nút này ẩn đi khi vào ván (nhường chỗ cho ⚙️).

**📱 Trên điện thoại** nút cảm ứng tự hiện. Bảng ⚙️ cho chọn **kiểu điều khiển**:

- **✚ Nút D-pad** — bốn nút hướng rời, bấm chính xác.
- **🕹️ Joystick** — cần analog: đặt ngón cái xuống rồi rê để đi 8 hướng.

Cỡ nút/joystick chỉnh được trong bảng ⚙️; cả kiểu điều khiển lẫn cỡ đều được nhớ cho lần sau. Khi **xoay ngang** máy, nút cảm ứng mờ bớt và co lại về hai góc để không che tầm nhìn, đậm rõ trở lại lúc bạn chạm vào.

Điện thoại **chỉ chơi 1 người** ở chế độ chung máy — chỉ có một bộ nút cảm ứng nên P2–P4 sẽ đứng chôn chân. Muốn chơi cùng bạn thì mỗi người một máy qua phòng online.

Máy tính bảng hoặc laptop cảm ứng **có cắm bàn phím rời** thì mở trang bằng `index.html?keyboard=1` để lấy lại chế độ 2–4 người. Trình duyệt không có cách nào tự biết bạn có bàn phím thật hay không, nên phải nói cho nó biết.

## Chơi online

Một người bấm **Tạo phòng** → nhận mã 4 ký tự → gửi mã qua Zalo/Discord → bạn bè nhập ở **Vào phòng bạn bè**.

Game dùng WebRTC (PeerJS) nối trực tiếp giữa các máy nên **không cần server**. Muốn bạn bè vào được thì phải có link công khai: dự án đang deploy bằng [Vercel](https://vercel.com); Netlify Drop hoặc itch.io cũng chạy tốt.

Vài điều nên biết trước khi rủ bạn:

- **Ai thoát hoặc rớt mạng thì bị xoá khỏi trận ngay.** Host đợi 9 giây im lặng là coi như rớt — đổi wifi trên điện thoại làm đứt kết nối mà chẳng báo gì cả.
- **Không vào lại được giữa ván.** Ván đang chạy thì host từ chối mọi kết nối mới. Phải chờ hết giờ; lúc đó cửa mở lại và người vào sẽ có mặt ở ván kế tiếp.
- **Bảng ⚙️ chỉ tạm dừng ván chung 1 máy.** Ván online vẫn chạy tiếp sau lưng bạn — mở bảng ra là thấy dòng cảnh báo.
- Chủ phòng thoát = giải tán phòng cho tất cả.

## Cách chơi

Mỗi ván 3 phút. Có 3 level, khó dần.

1. Nhìn **đơn hàng** trên HUD — mỗi đơn cần vài nguyên liệu và có đồng hồ đếm ngược riêng.
2. Lấy nguyên liệu ở **📦 thùng** (hàng trên).
3. Sơ chế đúng cách: 🍅 🧅 🥩 mang ra **🔪 thớt** chặt; 🍜 🥚 🍚 đặt lên **🍳 bếp** nấu.
4. **Đừng quên đồ trên bếp** — chín rồi mà để lâu là **🔥 cháy**. Dập lửa bằng cách lấy 💧 ở **🚿 vòi nước** rồi tương tác vào bếp đang cháy.
5. Mang đồ đã chín/chặt ra **🛎️ quầy giao**. Đủ nguyên liệu một đơn = tiền về. Giao trễ bị trừ phần trăm; trễ quá thì khách bỏ đi (−500đ).
6. Sống sót qua sự cố ngẫu nhiên (bảng dưới).
7. Hết giờ mà đạt mục tiêu tiền = ⭐⭐⭐. Cuối ván mỗi người nhận một danh hiệu cà khịa theo đóng góp thật.

### 🤾 Ném đồ

Ném nguyên liệu theo hướng đang nhìn. Đồng đội tay không sẽ **bắt dính** — chuyền cà chua xuyên bếp là phối hợp đỉnh. Còn ai đang cầm đồ mà bị ném trúng thì **ăn nguyên vào mặt, choáng 1 giây**. Ném trúng nhiều thì được danh hiệu "🎯 Xạ Thủ Cà Khịa".

Người chơi cũng **húc nhau văng** được. Chặn cửa đồng đội là một chiến thuật (tồi).

### 9 loại sự cố

| | Sự cố | Hậu quả |
|---|---|---|
| ⚡ | Cắt điện | Tối om, phải chạy tới 💡 công tắc |
| 🔥 | Cháy bếp | Dập bằng 💧 lấy ở vòi nước |
| 👑 | Khách VIP | Tiền x2 nhưng chỉ có 22 giây |
| 😤 | Đình công | Một người đứng im 8 giây |
| 🐀 | Chuột cướp đồ | Cả đám dồn góc mới bắt được; 18 giây không bắt là mất luôn |
| 🌀 | Đảo phím | 6 giây trái thành phải |
| 🧼 | Sàn trơn | 10 giây trượt như bôi mỡ, không phanh được |
| 📞 | Sếp gọi điện | Đứng chôn chân, bấm tương tác 3 lần để dập máy |
| 🔄 | Đổi ca đột xuất | Hai người bị hoán đổi vị trí tức thì |

## 📹 Quay clip

Mở bảng **⚙️** khi đang chơi rồi bấm **⏺ Quay clip**. Bấm lại để dừng, file `.webm` tự tải về. Hết level lúc đang quay dở thì clip cũng tự lưu.

Kéo file `.webm` vào CapCut/Premiere để cắt và xuất mp4. Mỗi ván 3 phút — vừa khít định dạng short.

---

## Cấu trúc mã nguồn

```
src/
  index.html            khung trang: menu, phòng chờ, khung game, màn kết thúc
  static/favicon.*      icon chảo trứng (SVG + PNG + ICO)
  static/css/           base (design token) · menu · lobby · game · controls · endscreen
  static/js/
    constants.js        hằng số, nguyên liệu, công thức, level, bố cục bếp, bảng màu canvas
    gameplay.js         mô phỏng: người chơi, trạm, đơn hàng, sự cố, tính điểm
    render.js           vẽ canvas (HUD, bếp, nhân vật) + phát âm thanh theo diff giữa 2 view
    network.js          PeerJS: tạo/vào phòng, đồng bộ input và view giữa host/client
    input.js            bàn phím, nút D-pad, cần analog, chọn kiểu điều khiển + cỡ nút
    ui.js               chuyển màn hình, bảng tuỳ chọn, quay clip, vòng lặp chính
    audio.js            hiệu ứng âm thanh sinh bằng WebAudio, không cần file nhạc
    dom.js              tiện ích DOM
  tests/                Playwright: chơi local, nút cảm ứng, và 4 bộ test online
```

Kiến trúc mạng là **host uy quyền**: chủ phòng chạy toàn bộ mô phỏng, client chỉ gửi input lên và nhận về ảnh trạng thái (`view`) khoảng 14 lần mỗi giây để vẽ, có nội suy vị trí cho mượt.

Mô phỏng chạy bằng `setInterval` chứ **không** dùng `requestAnimationFrame` — trình duyệt tạm dừng rAF khi tab bị ẩn, nên chủ phòng chuyển tab là cả trận đứng hình. `rAF` giờ chỉ lo việc vẽ.

Chỉnh độ khó bằng các hằng số ở đầu `constants.js`: `COOK_TIME`, `BURN_AFTER`, `LEVELS`, `RECIPES`.

Màu sắc có **hai bản song song phải sửa cùng lúc**: biến CSS trong `static/css/base.css` cho giao diện DOM, và hằng `T` / `ST_CLAY` trong `constants.js` cho canvas — vì canvas không đọc được biến CSS. Giao diện sáng/tối chỉ đảo màu nền/chữ của phần DOM (biến CSS + `[data-theme="light"]`); lớp canvas trong ván cố tình giữ tối vì nó nằm trên nền game tối.

Canvas vẽ theo `devicePixelRatio`: `fitCanvas()` trong `render.js` đặt kích thước bộ đệm bằng cỡ CSS × DPR nên nét căng khi phóng to hoặc full màn hình, thay vì mờ như khi kéo dãn một ảnh 832×662 cố định.

## Chạy test

Cần **Node 18 trở lên** (Playwright không chạy trên Node 16).

```bash
cd src
npm install
npx playwright install chromium
npm test
```

Bộ test online (`tests/online-*.spec.js`) mở hai trang thật và bắt tay WebRTC nên chạy chậm và cần mạng. `tests/online-cross-network.spec.js` ép WebRTC chỉ đi qua TURN relay để giả lập hai người ở hai mạng khác nhau — **2 test trong đó fail có chủ ý** cho tới khi bạn cấu hình TURN thật (xem dưới). Đừng nới lỏng chúng để "cho qua".

## ⚠️ Cần TURN server thì online mới chạy mọi nơi

Hai người cùng một wifi thì nối thẳng được nhờ STUN. Nhưng nếu ai đó dùng **4G, wifi trường/công ty, hoặc double-NAT** thì STUN bó tay, phải có TURN làm chặng chuyển tiếp — không thì họ không bao giờ vào được phòng.

`TURN_SERVERS` trong `static/js/network.js` đang **để trống**. TURN miễn phí Open Relay mà bản cũ dùng đã chết: đo lại bằng cách gom ICE candidate trong Chromium (09/07/2026), cả `openrelay.metered.ca` (cổng 80, 443, 443/tcp) lẫn `staticauth.openrelay.metered.ca` đều trả về **0 relay candidate**, trong khi STUN từ cùng máy vẫn cho `srflx` bình thường. Giữ chúng lại chỉ khiến trình duyệt chờ hết giờ rồi mới chịu thua.

Cách bật lại: đăng ký gói miễn phí ở [metered.ca](https://metered.ca) (50GB/tháng, có API key) hoặc tự dựng `coturn`, rồi điền vào `TURN_SERVERS`. Xong thì 2 test cross-network sẽ tự chuyển xanh — đó là cách xác nhận TURN thật sự hoạt động chứ không phải "khai báo cho có".

## Vấn đề đã biết

- **Không có TURN thì một phần người chơi không vào được phòng** (mục trên). Giờ ít nhất họ nhận được thông báo lỗi sau 20 giây thay vì ngồi nhìn "Đang kết nối..." mãi mãi. Đây là giới hạn của WebRTC, không phải bug sửa được bằng code.
- Nhân tiện: **không phải lỗi CORS** — WebRTC và WebSocket không nằm dưới cơ chế CORS. Signaling `0.peerjs.com` cũng khoẻ (đo 4 lần, cấp id trong ~700ms).
- **Emoji đổi hình theo hệ điều hành.** Toàn bộ art là emoji, nên 🥸 và 🧑‍🍳 trên Android/iOS trông khác Windows. Chỉ hết khi thay bằng sprite thật.
- **Chơi 1 người trên điện thoại chưa được cân bằng.** Mục tiêu tiền của Level 2 và 3 tính cho nhiều người; một mình gần như không đạt nổi. Cần hạ mục tiêu khi `localN === 1`.

## So với GDD

- Chưa có skill riêng từng nhân vật (Sơn nấu nhanh, Lan chặt nhanh...) — 4 nhân vật hiện giống hệt nhau.
- 3 level dùng chung một layout bếp, chỉ khác mục tiêu tiền, số đơn và tần suất sự cố. GDD tính 15 level, mỗi level một layout.
- Chưa có: skin/unlock, sự cố "rửa bát vỡ", AI đồng đội cho chế độ 1 người.
- Đồ hoạ emoji thay cho sprite Kenney.

## Bước tiếp theo

1. Rủ 2–3 đứa bạn chơi thử online rồi quay clip. Cười được là concept đứng vững.
2. Tinh chỉnh balance bằng các hằng số trong `constants.js`.
3. Port sang Unity + Mirror theo GDD để bán Steam. Toàn bộ logic (order system, event manager, state) dịch sang C# gần như 1:1.
