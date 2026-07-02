# Chaos Chef — Web Prototype 🍳

Bản chơi thử trên trình duyệt của Chaos Chef (rút gọn từ `chaos_chef_gdd.md`). **1 file duy nhất `index.html`** — không cần cài gì, mở lên là chơi.

## Chạy game

Mở `index.html` bằng Chrome/Edge (double-click là được). Cần có mạng vì game tải thư viện PeerJS từ CDN.

## 2 chế độ chơi

**🛋️ Chung 1 máy (2–4 người):** chọn số người ở menu, bấm "Vào bếp ngay". Phím:

| Người chơi | Di chuyển | Tương tác | Ném đồ 🤾 |
|---|---|---|---|
| P1 (Sơn 👨‍🍳) | W A S D | E | Q |
| P2 (Lan 👩‍🍳) | ← ↑ ↓ → | Enter | / |
| P3 (Tuấn 🧑‍🍳) | I J K L | O | U |
| P4 (Huy 🥸) | T F G H | Y | R |

**🌐 Online qua mạng:** một người bấm "Tạo phòng" → nhận mã 4 ký tự → gửi mã qua Zalo/Discord → bạn bè nhập mã ở "Vào phòng bạn bè". Chơi từ xa như Among Us, vừa chơi vừa gọi Discord là đúng bài. Online dùng WASD hoặc mũi tên + E/Space, ném đồ bằng Q hoặc Shift, **emote nhanh phím 1–4** ("NHANH LÊN!! 😡", "LỖI TẠI MÀY 👉"...).

**🤾 Ném đồ:** ném nguyên liệu theo hướng đang nhìn. Đồng đội tay không sẽ **bắt dính** (chuyền cà chua xuyên bếp = phối hợp đỉnh) — còn ai đang cầm đồ mà bị ném trúng thì **ăn nguyên vào mặt, choáng 1 giây**. Ném trúng nhiều được danh hiệu "🎯 Xạ Thủ Cà Khịa".

> Lưu ý online: game dùng WebRTC (PeerJS) kết nối trực tiếp giữa các máy, **không cần thuê server**. Cách chắc ăn nhất để bạn bè cùng chơi là up file lên hosting miễn phí rồi gửi link:
> - **itch.io**: nén `index.html` thành .zip → tạo project mới → tick "This file will be played in the browser". Miễn phí, có luôn trang giới thiệu game.
> - **Netlify Drop** (app.netlify.com/drop): kéo thả thư mục vào là có link ngay.
> - Hoặc gửi thẳng file `index.html` cho bạn bè, mỗi người tự mở trên máy mình.

## Cách chơi (vòng lặp 3 phút)

1. Nhìn **đơn hàng** trên đầu màn hình — mỗi đơn cần vài nguyên liệu.
2. Lấy nguyên liệu ở **📦 thùng** (hàng trên).
3. Sơ chế cho đúng: 🍅🧅🥩 mang ra **🔪 thớt** chặt, 🍜🥚🍚 đặt lên **🍳 bếp** nấu.
4. **Đừng để quên đồ trên bếp** — chín rồi mà không lấy là 🔥 CHÁY. Dập lửa bằng cách lấy 💧 ở **🚿 vòi nước** rồi tương tác vào bếp cháy.
5. Mang đồ ĐÃ chín/chặt ra **🛎️ quầy giao**. Đủ nguyên liệu 1 đơn = tiền về. Giao trễ bị trừ %, trễ quá là khách bỏ đi (-500đ).
6. Sự cố ngẫu nhiên (9 loại): ⚡ cắt điện (chạy tới 💡 công tắc), 🔥 cháy bếp, 👑 khách VIP (tiền x2, 22 giây), 😤 đình công 8 giây, 🐀 **chuột cướp đồ trên tay** (cả đám dồn góc mới bắt được, 18 giây không bắt là mất luôn), 🌀 **đảo phím** 6 giây (trái thành phải), 🧼 **sàn trơn** 10 giây (trượt như bôi mỡ, không phanh được), 📞 **sếp gọi điện** (đứng chôn chân, bấm tương tác 3 lần để dập máy), 🔄 **đổi ca đột xuất** (2 người bị hoán đổi vị trí tức thì). Ngoài ra người chơi **húc nhau văng** được — chặn cửa đồng đội là một chiến thuật (tồi).
7. Hết 3 phút: đạt mục tiêu tiền = ⭐⭐⭐. Có 3 level, khó dần.

## 📹 Quay clip khoảnh khắc tấu hài

Bấm **⏺ Quay clip** góc phải trên khi đang chơi → bấm lại để dừng → file `.webm` tự tải về. Hết level đang quay dở thì clip cũng tự lưu. File .webm mở kéo vào CapCut/Premiere để cắt và xuất mp4 đăng TikTok/YouTube Shorts (mỗi ván 3 phút — vừa khít định dạng short).

## So với GDD (những gì đã rút gọn cho prototype)

- Chưa có skill riêng từng nhân vật (Sơn nấu nhanh, Lan chặt nhanh...) — 4 nhân vật hiện giống nhau.
- 3 level dùng chung layout bếp, chỉ khác mục tiêu/số đơn/tần suất sự cố (GDD: 15 level, layout riêng).
- Chưa có: skin/unlock, sự cố "rửa bát vỡ", AI đồng đội cho chế độ 1 người.
- Đồ họa emoji thay cho sprite Kenney.

## Bước tiếp theo (nếu prototype vui)

1. Rủ 2–3 đứa bạn chơi thử online, quay clip — nếu cười được là concept đứng vững.
2. Tinh chỉnh balance ngay trong file này (các hằng số `COOK_TIME`, `BURN_AFTER`, `LEVELS`, `RECIPES` ở đầu `<script>` — sửa số là xong).
3. Port sang Unity + Mirror theo GDD để bán Steam. Toàn bộ logic (order system, event manager, state) trong file này dịch sang C# gần như 1:1.
