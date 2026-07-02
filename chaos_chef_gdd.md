# **Chaos Chef - Game Design Document**

**Project Status**: Pre-Production  
**Target Platform**: PC (Steam)  
**Engine**: Unity 2D (hoặc Godot nếu bạn chọn)  
**Team Size**: 1 (solo dev)  
**Timeline**: 4–5 tuần  
**Target Price**: $4.99–7.99 USD  

---

## **1. High Concept**

"Chaos Chef" là một game co-op 2–4 người trong đó các nhân vật cùng làm bếp phục vụ khách hàng trong thời gian giới hạn. Không phải strategy, mà là **action-based chaos**—mọi kế hoạch đều đổ nát, và từng khoảnh khắc bất lực đều trở thành nội dung viral.

**Tagline**: *"Hợp tác, hoảng loạn, cười tím mặt."*

**Core Loop (mỗi level 2–3 phút)**:
1. Xem đơn hàng (1 tấm màn hình hiển thị 3–5 đơn hàng từ khách hàng)
2. Chia công việc giữa các nhân vật
3. Nấu ăn: chặt rau, nấu mì, xếp đĩa → chuỗi action với timing
4. Phục vụ khách hàng → nhận tiền / bonus thời gian
5. **Sự cố bất ngờ xảy ra** → tất cả phối hợp để cứu tình hình hoặc thất bại
6. Level kết thúc → điểm số → next level

---

## **2. Gameplay Mechanics**

### **2.1 Nhân vật & Vai trò**

Có 4 nhân vật cố định (có thể mở khóa thêm qua levels):

| Tên | Skill | Hạn chế |
|-----|-------|---------|
| **Đầu Bếp Sơn** | Nấu mì nhanh gấp đôi | Không thể rửa bát |
| **Phụ Bếp Lan** | Chặt rau + rửa bát nhanh | Nấu mì chậm hơn |
| **Tạp vụ Tuấn** | Mang đĩa + gọi khách | Di chuyển chậm hơn |
| **Học Việc Huy** | Năng lực cân bằng | Tất cả skill đều trung bình |

Người chơi chọn 2–4 nhân vật, mỗi session cố định vai trò đó (không thể đổi mid-game).

---

### **2.2 Hệ Thống Đơn Hàng**

**Ví dụ Đơn Hàng:**
```
🍜 Mì tôm cà chua
  • Nấu mì (10s)
  • Xếp cà chua (5s)
  • Hành lá (3s)
  → Tổng: ~25s
  💰 Phần thưởng: +2000 xu + 10 bonus time
```

**Cơ chế Chaining (từng bước xâu chuỗi):**
- Mỗi bước phải **hoàn thành đúng thứ tự**
- Nếu nhân vật sai thứ tự (ví dụ: xếp cà chua trước khi nấu mì), cả đơn hàng **bị hỏng** (nó rơi khỏi tay, nhân vật bị "jank" và phải quay lại từ đầu)
- Khi một người đặt sai thứ tự, người khác nhìn thấy được ("! sai rồi!") → cơ hội để chế nhạo

**Khó độ Scaling:**
- Level 1–5: 2–3 đơn hàng, 2 bước mỗi đơn
- Level 6–10: 3–4 đơn hàng, 3–4 bước mỗi đơn
- Level 11–15: 5–6 đơn hàng, 4–5 bước, **có nhân vật rút khỏi công việc** (ví dụ: đầu bếp bất ngờ "ngủ" 10 giây → người khác phải cover)

---

### **2.3 Sự Cố Bất Ngờ (Random Events)**

Mỗi 30–60 giây, một trong các sự cố này xảy ra ngẫu nhiên:

| Sự cố | Tác động | Cách Khắc Phục |
|-------|---------|----------------|
| **Cắt điện** | Màn hình tối 5 giây, nhân vật vẫn di chuyển được (nhưng nhìn không thấy) | Phải nhớ vị trí, hoặc bấm nút gọi "Bắt Đèn" (bất kỳ nhân vật nào bấm) |
| **Bếp Cháy** | 1 bếp bốc lửa, phục vụ được từ bếp đó = hỏng đơn hàng | Bất kỳ nhân vật nào đứng trên "vòi nước" 2 giây để tắt lửa |
| **Khách Vội** | 1 khách hàng bất ngờ tăng giá trị đơn hàng gấp đôi nhưng yêu cầu done trong 15 giây | Tất cả hợp tác speed-run hoặc bỏ đơn hàng khác |
| **Rửa Bát Vỡ** | Bát sạch trong kho bất ngờ giảm (do vỡ), các đơn hàng yêu cầu thêm "rửa bát trước" | Yêu cầu thêm bước rửa bát 5 giây |
| **Nhân Viên Bất Mãn** | 1 nhân vật bốc cơm, ngồi suỵt 15 giây (không tham gia) | Người khác phải cover hết việc |

**UI Hiển Thị Sự Cố:**
- Một icon đỏ sáng ở góc màn hình (ví dụ: 🔥 nếu cháy)
- Text gợi ý: "Cắt điện! Bấm Nút Đèn!" (ghi mũi tên chỉ vị trí nút)

---

### **2.4 Điểm Số & Thành Công**

**Mỗi Đơn Hàng:**
- ✅ Hoàn thành đúng giờ = 100% tiền
- ⏱️ Quá 5 giây = 75% tiền
- ⏱️ Quá 10 giây = 50% tiền
- ❌ Vỡ/Hỏng = 0 tiền + -500 xu penalty

**Cuối Level:**
- Tính tổng tiền
- Nếu tổng ≥ mục tiêu → ⭐⭐⭐ (3 sao)
- Nếu tổng ≥ 70% mục tiêu → ⭐⭐ (2 sao)
- Nếu tổng ≥ 40% mục tiêu → ⭐ (1 sao)
- Nếu < 40% → ❌ Level thất bại (có thể retry)

---

## **3. Tại Sao Nó Hài (Entertainment Value)**

### **Khoảnh Khắc Hài Hước**

1. **"Sắp Xong Rồi" → Sập Hoàn Toàn**
   - Tất cả cộng tác 1.5 phút, gần hoàn thành → Bất ngờ cháy bếp → Tất cả chaos
   - Clip: "Chúng tôi: *mọi người chạy lung tung* | Khách hàng: *chờ mỏi*"

2. **Phối Hợp Sai Lạc**
   - "1, 2, 3, CẮT!" (cùng lúc cắt rau) → Hai người cắt, hai người đáp "SAO MẤY CẬU CẮT RỒI?!"
   - Clip: *Confusing chaos*

3. **Nhân Viên Bốc Cơm Bất Ngờ**
   - Giữa lúc chaotic, 1 nhân vật "ngồi suỵt" → Người khác hết chỗ đứng, phải xếp hàng chờ → Hài

4. **Cắt Điện + Hoảng Loạn**
   - Tối đen, 2 người va chạm nhau → Ai cũng hét
   - Clip: *Sound design sẽ quyết định mức hài của clip này*

### **Video Content Strategy**

- Mỗi session 2–3 phút = dài đúng cho TikTok / YouTube Shorts
- Clip "sắp thành công → fail" là gold (high engagement)
- Discord: bạn có thể post clips từ Chaos Chef vào server gaming Vietnamese để test organic reach

---

## **4. Technical Architecture**

### **4.1 Engine & Stack**

```
Lựa chọn A (Recommended): Unity 2D
├─ Kenney assets (miễn phí, cartoon style)
├─ Mirror networking (C# multiplayer library)
├─ StateMachine cho nhân vật
└─ Unity IAP cho monetization

Lựa chọn B (Alternative): Godot
├─ Built-in networking (GDScript)
├─ SimpleUI cho menu
└─ Nếu bạn quen GDScript thôi
```

**Mình gợi ý: Unity vì bạn quen C# từ WCF backend.**

---

### **4.2 Code Structure**

```
ChaosChef/
├── Assets/
│   ├── Sprites/
│   │   ├── Characters/
│   │   ├── Kitchen/
│   │   └── UI/
│   ├── Prefabs/
│   │   ├── Player.prefab
│   │   ├── DishStation.prefab
│   │   └── OrderDisplay.prefab
│   ├── Scripts/
│   │   ├── Networking/
│   │   │   ├── NetworkManager.cs
│   │   │   ├── PlayerController.cs
│   │   │   └── SyncTransform.cs
│   │   ├── Gameplay/
│   │   │   ├── OrderSystem.cs
│   │   │   ├── DishStation.cs
│   │   │   ├── EventManager.cs (sự cố bất ngờ)
│   │   │   └── ScoreManager.cs
│   │   ├── UI/
│   │   │   ├── OrderDisplay.cs
│   │   │   ├── ScoreUI.cs
│   │   │   └── EventAlertUI.cs
│   │   └── StateMachine/
│   │       ├── CharacterState.cs
│   │       ├── IdleState.cs
│   │       ├── CookState.cs
│   │       └── DeliverState.cs
│   └── Audio/
│       ├── SFX/
│       └── BGM/
└── Scenes/
    ├── MainMenu.unity
    ├── Level_01.unity
    ├── Level_02.unity
    └── ...
```

---

### **4.3 Game Loop Pseudocode**

```csharp
// Main Game Loop (per frame)
public class GameManager : MonoBehaviour
{
    private float levelTimer = 180f; // 3 phút per level
    private List<Order> activeOrders = new();
    
    void Update()
    {
        levelTimer -= Time.deltaTime;
        
        // Nhân vật đi lại
        foreach (var player in players)
        {
            player.HandleInput();
            player.Move();
        }
        
        // Kiểm tra interaction (station gần nhân vật?)
        foreach (var station in stations)
        {
            if (DistanceToClosestPlayer(station) < interactionRadius)
            {
                station.ShowInteractionPrompt();
            }
        }
        
        // Cập nhật trạng thái đơn hàng
        foreach (var order in activeOrders)
        {
            order.timer -= Time.deltaTime;
            if (order.timer <= 0)
            {
                CompleteOrder(order, successful: false); // Timeout
            }
        }
        
        // Random event every 30-60s
        if (Random.value < 0.001f) // Roughly every 60s
        {
            TriggerRandomEvent();
        }
        
        // Game over?
        if (levelTimer <= 0)
        {
            EndLevel();
        }
    }
}
```

---

### **4.4 Multiplayer Networking**

**Sử dụng Mirror (C# networking library)**

```csharp
// PlayerController.cs (mỗi player có một instance này)
public class PlayerController : NetworkBehaviour
{
    [SerializeField] private float moveSpeed = 5f;
    private Vector2 moveInput;
    
    [ServerRpc] // Server chạy code này
    public void CmdCutVegetable(int stationId)
    {
        var station = StationManager.GetStation(stationId);
        station.CutVegetable(this.gameObject);
        
        // Broadcast cho tất cả clients
        RpcShowCutAnimation(stationId);
    }
    
    [ClientRpc] // Tất cả clients chạy code này
    public void RpcShowCutAnimation(int stationId)
    {
        var station = StationManager.GetStation(stationId);
        station.PlayCutAnimation();
    }
}
```

**Flow:**
1. Local player bấm "cut" → gửi request lên server
2. Server xác nhận action hợp lệ
3. Server broadcast kết quả cho tất cả players
4. Tất cả clients cập nhật UI/animation

---

### **4.5 Platforms & Build Target**

**Phase 1 (MVP):**
- PC (Steam) 64-bit
- Hoạt động offline nếu có 1 player (single-player mode với AI khác)
- Local multiplayer (2–4 players, 1 máy, shared keyboard/gamepad)

**Phase 2 (Post-Launch, nếu có feedback):**
- Online multiplayer (nhờ Mirror)
- Mac/Linux build
- Possibly console (Switch) nếu có publisher

---

## **5. Content & Progression**

### **5.1 Levels**

- **15 levels total** trong MVP
- Mỗi level có:
  - Kitchen layout khác (hình dáng bếp, số station)
  - Đơn hàng khó hơn (bước nhiều hơn, timing chặt hơn)
  - Random event tần suất cao hơn

Ví dụ:

```
Level 1: "Bếp Nhà Ngoài"
- Kitchen: 1 mặt bếp, 1 kho
- Đơn hàng: 2 đơn max, 2 bước mỗi đơn
- Sự cố: Không có
- Mục tiêu: 2000 xu

Level 7: "Bếp Xe Hàng"
- Kitchen: 2 mặt bếp (cạnh nhau), 1 kho, 1 tủ lạnh
- Đơn hàng: 4 đơn, 3–4 bước mỗi đơn
- Sự cố: 1 sự cố ngẫu nhiên per 60s
- Mục tiêu: 8000 xu

Level 15: "Bếp Trên Tàu Cao Tốc"
- Kitchen: 3 station phân tán, đường ngắn + chun
- Đơn hàng: 5 đơn, 4–5 bước mỗi đơn
- Sự cố: 2 sự cố mỗi level
- Mục tiêu: 15000 xu
```

---

### **5.2 Unlock System**

- **Nhân vật mới**: Unlock sau level 5, 10, 15
- **Skins**: Dùng xu kiếm được để mua (cosmetic, không ảnh hưởng gameplay)
- **Kitchen themes**: Unlock theo progression (bếp Việt, bếp Thái, bếp Hàn)

---

## **6. Monetization Strategy**

### **6.1 Base Model: Premium + Cosmetics**

**Giá bán:** $6.99 USD (giá trăng cân cho game co-op)  
**Nơi bán:** Steam (80% indie games đặt giá $5–15)

**Trong game:**
- ❌ Không có pay-to-win
- ✅ Cosmetics (skins, emotes) có thể mua bằng:
  - Real money (ngay)
  - In-game currency (xu, phải chơi 5–10 levels để mua 1 skin)

### **6.2 DLC Strategy (Post-Launch)**

Sau 2–3 tháng nếu sales tốt:
- **DLC 1** ($2.99): 5 levels mới + 2 nhân vật mới
- **DLC 2** ($2.99): Alternative Kitchen themes + 1 game mode mới (ví dụ: "Survival Mode" — cứ nấu 10 phút liên tiếp)

### **6.3 Expected Revenue**

Dự báo (Conservative Estimate):
- **First month**: 500–2000 copies × $6.99 = $3,500–14,000
- Dựa trên: viral clips → organic discovery → referral từ bạn bè

⚠️ **Thực tế**: 80% indie game không đạt con số này. Nhưng game "tấu hài" có lợi thế là self-promoting (clips = ads).

---

## **7. Marketing & Distribution**

### **7.1 Launch Strategy**

1. **2 tuần trước launch:**
   - Post clip gameplay trên TikTok / YouTube Shorts
   - Tag gaming Vietnamese creators
   - Discord gaming groups

2. **Launch day:**
   - Email danh sách bạn bè / đồng nghiệp
   - Post lên r/IndieGaming, r/Unity3D, v.v.
   - Stream trên Twitch (nếu có thời gian)

3. **Post-launch:**
   - Tương tác với streamers chơi game
   - Xin review từ YouTuber gaming nhỏ
   - Update minor bugs weekly → good sentiment

### **7.2 Organic Spread Mechanics**

- **Steam Cards** (nếu game bán được → Steam auto-add trading cards)
- **Achievements**: "Chaos Master" (win 10 levels with 3+ stars)
- **Social Features**: Bạn bè có thể xem high scores

---

## **8. Art & Audio (Outsourcing Strategy)**

Vì bạn solo dev, mình khuyến cáo:

### **Art:**
- **Character & UI**: Dùng Kenney assets (miễn phí, cartoon style)
- **Custom**: Thuê artist Fiverr ($50–100/asset) nếu cần skins riêng
- **Hoặc**: Tự vẽ bằng Aseprite nếu bạn quen (không bắt buộc — Kenney assets đã khá đủ)

### **Audio:**
- **SFX**: Freesound.org (miễn phí, mở rộng rộng)
- **BGM**: Epidemic Sound (subscription $10/tháng, hoặc dùng royalty-free từ Freesound)
- **Custom**: Nếu budget, thuê composer ($300–500 cho 3 track BGM + SFX pack)

---

## **9. Development Timeline**

### **Week 1–2: Core Mechanics**
- [x] Thực hiện networking (Mirror setup)
- [x] Player controller + input handling
- [x] Order system + state machine
- [x] Basic UI (order display, score)

### **Week 2–3: Content**
- [x] 5 levels design
- [x] Random events
- [x] Sound design (placeholder)
- [x] Cosmetics system

### **Week 3–4: Polish & Bug Fix**
- [x] Playtesting (2–3 sessions với bạn)
- [x] Bug fixes
- [x] Difficulty balancing
- [x] UI/UX improvement

### **Week 4–5: Launch Prep**
- [x] Build optimization
- [x] Steam store page
- [x] Trailer edit (hoặc gameplay clip)
- [x] Soft launch (beta testers)
- [x] Marketing setup
- [x] Launch! 🚀

---

## **10. Success Metrics (Post-Launch)**

- **Download target (realistic):** 200–500 trong tháng đầu
- **Wishlist target (Steam):** 50–100 pre-launch
- **Peak concurrent players (early):** 10–20 (vì co-op)
- **Revenue target (3 months):** $1,000–5,000 (để "thành công" cho project đầu tiên)

---

## **11. Known Risks & Mitigation**

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Networked multiplayer là phức tạp** | Delay 1–2 tuần | Dùng Mirror (simplified), test sớm |
| **Gameplay bị "quá dễ" hoặc "quá khó"** | Player churn cao | Playtest weekly, adjust level parameters |
| **Không có interest từ players** | 0 revenue | Build viral clips trước launch |
| **Competitors (Overcooked clone)** | Khó stand out | Focus vào "Vietnamese flavor" + chaos humor |

---

## **12. Additional Notes**

### **Why This Game?**

1. ✅ **Công nghệ đơn giản** → Bạn có thể làm solo trong 4–5 tuần
2. ✅ **Self-promoting** → Clips = organic marketing
3. ✅ **Entry point tốt** → Làm xong game 1, bạn biết quy trình, rồi làm game 2 nhanh hơn
4. ✅ **Co-op appeal** → Bạn bè muốn chơi cùng → word-of-mouth

### **Alternative Themes** (nếu muốn pivot):
- Pizza shop (có sẵn assets nhiều)
- Sushi bar (Việt Nam -> Nhật Bản close)
- Food truck (tương tự, nhưng setting khác)

---

## **13. Contact & Resources**

- **Engine Docs**: [Unity Learn](https://learn.unity.com/), [Mirror Documentation](https://mirror-networking.gitbook.io/)
- **Art Assets**: [Kenney.nl](https://kenney.nl/)
- **Networking**: Mirror GitHub ([assetstore](https://assetstore.unity.com/packages/tools/network/mirror-129321))
- **Steam Publishing**: [Steamworks Documentation](https://partner.steamgames.com/doc/home)

---

**Document Version**: 1.0  
**Last Updated**: June 2026  
**Author**: Kmarj (Giang Văn Hưng)
