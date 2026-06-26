# Chaos Chef — Unity Setup Guide

## Bước 1: Tạo Unity Project

1. Mở **Unity Hub** → **New Project**
2. Chọn template: **2D (Core)**
3. Đặt tên: `ChaosChef`
4. **Quan trọng**: Chọn Unity **2022.3 LTS** hoặc **6000.x LTS**
5. Click **Create Project**

---

## Bước 2: Import Mirror Networking

Mirror là thư viện multiplayer bạn cần. Cài qua Asset Store:

1. Trong Unity, mở **Window → Package Manager**
2. Click dấu **+** → **Add package from git URL**
3. Dán URL: `https://github.com/MirrorNetworking/Mirror.git`
4. Hoặc vào **Asset Store** → tìm "Mirror" → Import (miễn phí)

> Sau khi import Mirror, các script `NetworkBehaviour`, `[Command]`, `[ClientRpc]`... sẽ compile được.

---

## Bước 3: Copy Scripts vào Project

Copy toàn bộ folder `Assets/` từ repo này vào folder `Assets/` của Unity project vừa tạo.

Cấu trúc sau khi copy:
```
ChaosChef/
└── Assets/
    ├── Scripts/
    │   ├── Data/          ← Order, OrderStep, CharacterData
    │   ├── Gameplay/      ← GameManager, OrderSystem, DishStation, EventManager, ScoreManager
    │   ├── StateMachine/  ← CharacterStateMachine + các states
    │   ├── Networking/    ← PlayerController, NetworkManager, SyncTransform
    │   └── UI/            ← OrderDisplay, ScoreUI, EventAlertUI
    ├── Sprites/
    ├── Prefabs/
    └── Audio/
```

Đợi Unity compile (khoảng 10–30 giây). Nếu có lỗi đỏ → xem **Troubleshooting** bên dưới.

---

## Bước 4: Cài TextMeshPro

Các UI script dùng `TextMeshProUGUI`. Cài như sau:

1. **Window → Package Manager**
2. Tìm **TextMeshPro** → **Install**
3. Khi hỏi "Import TMP Essentials?" → **Import**

---

## Bước 5: Tạo Scenes

### 5a. Scene Level_01

1. **File → New Scene** → chọn **2D**
2. Save as `Scenes/Level_01`

**Tạo các GameObjects bắt buộc:**

| GameObject | Component cần gắn |
|------------|-------------------|
| `GameManager` | `GameManager.cs`, `OrderSystem.cs`, `ScoreManager.cs`, `EventManager.cs` |
| `NetworkManager` | `ChaosChefNetworkManager.cs`, `KcpTransport` (Mirror tự thêm) |
| `Canvas` | `OrderDisplay.cs`, `ScoreUI.cs`, `EventAlertUI.cs` |
| `Station_Bep` | `DishStation.cs` (StationType = CookingPot), `Collider2D` (trigger) |
| `Station_BanChat` | `DishStation.cs` (StationType = CuttingBoard), `Collider2D` (trigger) |
| `Station_VoiRua` | `DishStation.cs` (StationType = Sink), `Collider2D` (trigger) |
| `Station_Dia` | `DishStation.cs` (StationType = PlateCounter), `Collider2D` (trigger) |
| `Station_PhucVu` | `DishStation.cs` (StationType = ServingWindow), `Collider2D` (trigger) |

### 5b. Scene MainMenu (optional, làm sau)

1. **File → New Scene** → Save as `Scenes/MainMenu`
2. Tạo UI buttons: Host, Join, Quit

---

## Bước 6: Tạo CharacterData ScriptableObjects

4 nhân vật theo GDD cần 4 ScriptableObject riêng:

1. **Project panel** → chuột phải → **Create → ChaosChef → CharacterData**
2. Tạo 4 file, cấu hình theo bảng:

| File | characterName | role | moveSpeed | cookingSpeed | washingSpeed | Hạn chế |
|------|--------------|------|-----------|-------------|-------------|---------|
| `SO_DauBepSon` | Đầu Bếp Sơn | DauBepSon | 5 | 2.0 | 1.0 | cannotWashDishes = ✅ |
| `SO_PhuBepLan` | Phụ Bếp Lan | PhuBepLan | 5 | 1.0 | 2.0 | slowCooking = ✅ |
| `SO_TapVuTuan` | Tạp Vụ Tuấn | TapVuTuan | 3.5 | 1.0 | 1.0 | slowMovement = ✅ |
| `SO_HocViecHuy` | Học Việc Huy | HocViecHuy | 5 | 1.0 | 1.0 | (không có) |

---

## Bước 7: Tạo Player Prefab

1. **GameObject → Create Empty** → đặt tên `Player`
2. Gắn components:
   - `SpriteRenderer`
   - `Rigidbody2D` (Gravity Scale = 0, Freeze Rotation Z = ✅)
   - `CircleCollider2D` (là trigger cho detection station)
   - `Animator`
   - `NetworkIdentity` (Mirror)
   - `CharacterStateMachine`
   - `PlayerController` → kéo CharacterData vào
   - `SyncTransform`
3. Drag vào **Prefabs/** để tạo prefab
4. Tạo 4 bản copy cho 4 nhân vật, assign CharacterData tương ứng

---

## Bước 8: Tạo Order ScriptableObjects (data đơn hàng)

Hiện tại `OrderSystem` nhận `List<Order>` — bạn cần tạo data đơn hàng trong Inspector.

Ví dụ đơn "Mì Tôm Cà Chua" — tạo bằng cách:
1. Tạo `GameObject` tạm trong scene
2. Gắn `OrderSystem.cs`
3. Trong Inspector, expand `Available Orders`, thêm element:
   - orderName: "Mì Tôm Cà Chua"
   - timeLimit: 30
   - baseReward: 2000
   - bonusTimeSeconds: 10
   - Steps:
     - [0] stepName: "Nấu mì", duration: 10, requiredStation: CookingPot
     - [1] stepName: "Xếp cà chua", duration: 5, requiredStation: PlateCounter
     - [2] stepName: "Hành lá", duration: 3, requiredStation: PlateCounter

---

## Bước 9: Test Local Multiplayer

1. **File → Build Settings** → thêm Level_01 scene
2. Trong Unity Editor, nhấn **Play**
3. Trên `NetworkManager` GameObject → **Host (Server + Client)**
4. Mở thêm 1 instance game (build riêng) → **Client** → nhập IP `localhost`

> **Tip**: Dùng **ParrelSync** (Unity package) để chạy 2 instance trong Editor cùng lúc mà không cần build.

---

## Bước 10: Kenney Assets (Art miễn phí)

Download từ [kenney.nl](https://kenney.nl):
- [Topdown Shooter](https://kenney.nl/assets/topdown-shooter) — nhân vật view từ trên
- [Food Kit](https://kenney.nl/assets/food-kit) — icon đồ ăn cho UI đơn hàng
- [UI Pack](https://kenney.nl/assets/ui-pack) — buttons, panels

Kéo sprite vào `Assets/Sprites/` tương ứng.

---

## Troubleshooting

**Lỗi "The type or namespace 'Mirror' could not be found"**
→ Mirror chưa install. Xem Bước 2.

**Lỗi "The type or namespace 'TMPro' could not be found"**
→ TextMeshPro chưa install. Xem Bước 4.

**Lỗi "Assets/Scripts/... Assembly has compile errors"**
→ Mở Console (Ctrl+Shift+C), đọc lỗi đỏ đầu tiên, fix từ trên xuống.

**Nhân vật không di chuyển**
→ Kiểm tra `Rigidbody2D.Gravity Scale = 0` và player input axis đúng chưa.
→ Mở **Edit → Project Settings → Input Manager** → thêm `Horizontal2`, `Vertical2` nếu cần cho player 2.

**Station không detect nhân vật**
→ `Collider2D` trên Station phải tick **Is Trigger = ✅**
→ Player phải có `Rigidbody2D`
→ Layer Collision Matrix phải cho phép Player ↔ Station

---

## Thứ tự implement khuyến nghị (theo GDD Timeline)

**Tuần 1:**
- [ ] Setup project xong (guide này)
- [ ] Sprite placeholder cho 1 nhân vật + 3 stations
- [ ] Test di chuyển + interact cơ bản (offline, 1 player)
- [ ] Tạo 2 đơn hàng đơn giản, test OrderSystem

**Tuần 2:**
- [ ] Local multiplayer 2 người (Mirror, cùng 1 máy)
- [ ] Random events (bắt đầu với Bếp Cháy)
- [ ] ScoreUI hoàn chỉnh

**Tuần 3:**
- [ ] 5 levels đầu với layout khác nhau
- [ ] Sound effects placeholder
- [ ] Playtest với bạn

**Tuần 4–5:**
- [ ] Polish, bug fix, difficulty tuning
- [ ] Build + Steam store page
