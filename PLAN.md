# KẾ HOẠCH GAME: "NINJA PHONG ẢNH"

> Tên dự kiến, có thể đổi. Phương án khác: "Bóng Ninja", "Nhẫn Giả Truyền Kỳ".

> Game hành động màn hình ngang (run-and-gun) cho điện thoại, lấy cảm hứng từ lối chơi Contra:
> chạy – nhảy – tấn công 8 hướng – vượt màn – đánh boss.
> Thay người lính cầm súng bằng **các ninja**, mỗi người dùng một loại vũ khí riêng, có đặc điểm khác nhau.
> Đồ họa, nhân vật, màn chơi, âm thanh đều tự sáng tạo (không dùng hình ảnh/nhân vật/âm nhạc của Contra).

---

## 1. Mục tiêu & phạm vi

| Hạng mục | Quyết định |
|---|---|
| Nền tảng | **Chỉ chạy trên trình duyệt** điện thoại (Android/iOS), màn hình **ngang**; cài được lên màn hình chính (PWA). **Chưa** đưa lên Google Play / App Store |
| Engine | **Phaser** – engine game 2D cho web (vật lý, camera, tilemap, hoạt ảnh, âm thanh, cảm ứng có sẵn) |
| Độ phân giải logic | **480×270**, phóng to giữ nét pixel trên mọi màn hình |
| Hiệu năng | 60 FPS ổn định trên máy tầm trung |
| Ngôn ngữ | Tên game + toàn bộ giao diện **tiếng Việt có dấu** |
| Phạm vi v1 | **4 nhân vật, 3 màn**, mỗi màn 1 boss, 1 người chơi |
| Độ khó | Mỗi mạng có **3 tim** (dễ hơn Contra), chọn ninja trước mỗi màn |

### Các quyết định đã chốt
| # | Câu hỏi | Quyết định |
|---|---|---|
| 1 | Cách chọn nhân vật | **Chọn ninja trước mỗi màn** (không đổi giữa màn) |
| 2 | Độ khó | **3 tim** mỗi mạng, 3 mạng |
| 3 | Phạm vi | **Đủ 4 nhân vật + 3 màn** |
| 4 | Ngôn ngữ | **Tiếng Việt** cho tên game và giao diện |
| 5 | Phát hành | **Chỉ chơi trên trình duyệt** (PWA), chưa làm app cho kho ứng dụng |

---

## 2. Công nghệ sử dụng

Nguyên tắc: **dùng engine/thư viện có sẵn cho mọi phần "hạ tầng"**, code của mình chỉ tập trung vào lối chơi.

| Mục đích | Công nghệ | Lý do chọn |
|---|---|---|
| Engine game | **Phaser** (bản ổn định mới nhất – kiểm tra lúc khởi tạo dự án) | Có sẵn Arcade Physics, camera, tilemap, sprite animation, particle, tween, âm thanh, đa chạm, gamepad |
| Ngôn ngữ | **TypeScript** | Kiểm tra kiểu cho file dữ liệu (vũ khí, địch, màn) → ít lỗi, gợi ý code tốt |
| Công cụ build | **Vite** | Khởi động tức thì, tự tải lại khi sửa code, chạy thử trên điện thoại qua mạng LAN (`--host`) |
| Thiết kế màn chơi | **Tiled Map Editor** | Vẽ màn bằng chuột, đặt vị trí địch/boss/checkpoint trực quan, Phaser đọc trực tiếp file JSON |
| Joystick ảo | **phaser3-rex-plugins** (VirtualJoystick) | Joystick cảm ứng có sẵn hỗ trợ 8 hướng, đã được dùng rộng rãi |
| Kiểm thử logic | **Vitest** | Test các phần logic thuần (state machine, tính sát thương, cấp vũ khí) |
| Chất lượng code | **ESLint + Prettier** | Code thống nhất phong cách, bắt lỗi sớm |
| Cài lên màn hình chính | **vite-plugin-pwa** | Chơi toàn màn hình, chơi offline |
| Font chữ | **Font pixel có hỗ trợ tiếng Việt** (ứng viên: *VT323*, *Pixelify Sans*; thử hiển thị đủ dấu trước khi chốt), lưu sẵn trong dự án | Hiển thị đúng dấu tiếng Việt, kiểu chữ hợp phong cách retro, chạy được khi offline |
| Vẽ pixel-art | **Aseprite** (trả phí) hoặc **Piskel / LibreSprite** (miễn phí) | Xuất spritesheet + JSON hoạt ảnh mà Phaser đọc được |
| Hiệu ứng âm thanh | **jsfxr** (sfxr.me) | Tạo âm thanh kiểu retro miễn phí, xuất file .wav |
| Nhạc nền | **BeepBox** | Soạn nhạc chiptune trên trình duyệt, xuất .wav/.ogg |

**Cố ý KHÔNG dùng** (để giữ đơn giản): React/Vue cho UI, thư viện ECS, XState. Một class `StateMachine` nhỏ (~40 dòng) là đủ.

**Yêu cầu máy:** cài Node.js bản LTS và Tiled.

**Để sau v1:** đóng gói thành app Android/iOS bằng **Capacitor**. Có thể thêm sau mà không phải sửa code game.

---

## 3. Lối chơi cốt lõi (tham khảo Contra)

- **Di chuyển:** chạy trái/phải, nhảy xoay người, nằm sấp (giữ xuống), nhảy xuống xuyên qua sàn mỏng (xuống + nhảy).
- **Tấn công 8 hướng:** lên, xuống (khi đang nhảy), trái, phải và 4 hướng chéo. Giữ nút tấn công = đánh liên tục.
### 3.1. Tim & mạng (dễ hơn Contra)
- Mỗi mạng có **3 tim**, tổng cộng **3 mạng**.
- **Trúng đòn:** mất 1 tim, nhân vật bị đẩy lùi nhẹ + nhấp nháy bất tử **1.5 giây**.
- **Rơi xuống vực / chạm bẫy chết người:** mất 1 tim, hồi lại ở điểm đứng an toàn gần nhất (không chết ngay như Contra).
- **Hết 3 tim:** mất 1 mạng, hồi sinh tại chỗ với đầy tim + bất tử 2 giây, vũ khí giảm 1 cấp.
- **Hết mạng:** màn "Thua cuộc", được chọn **Chơi tiếp** từ đầu màn hiện tại (điểm về 0) hoặc về màn hình chính.
- Qua màn **không** hồi tim, nhưng có vật phẩm hồi tim rải trong màn.

### 3.2. Chọn ninja trước mỗi màn
- Trước mỗi màn có màn hình **Chọn Ninja**, hiển thị chỉ số và cho xem trước cách đánh.
- Không đổi ninja trong lúc đang chơi một màn.
- **Cấp vũ khí** gắn với người chơi, không gắn với ninja: đổi ninja ở màn sau vẫn giữ cấp hiện tại.

### 3.3. Vật phẩm (cuộn bí kíp)
Vật phẩm bay ngang màn hình, bắn rơi để nhặt:
- `Cuộn nâng cấp` – tăng cấp vũ khí (Lv1 → Lv3).
- `Cơm nắm` – hồi 1 tim (tối đa 3).
- `Khiên Ki` – chặn 1 đòn mà không mất tim.
- `Bom khói` – xóa toàn bộ đạn địch trên màn hình + gây sát thương nhẹ.

### 3.4. Điểm số
- Điểm số + bảng xếp hạng lưu trong máy (localStorage).
- Thưởng thêm điểm khi qua màn không mất tim nào.

---

## 4. Nhân vật & vũ khí

Chọn nhân vật trước mỗi màn. Mỗi vũ khí có **điểm mạnh và điểm yếu rõ ràng** để người chơi cảm nhận khác biệt.
Tên ninja giữ kiểu Nhật cho hợp chủ đề, còn tên vũ khí, kỹ năng và mô tả trong game đều là tiếng Việt.

### 4.1. Kage – Phi tiêu (Shuriken) · *cân bằng, dễ chơi*
- Phóng phi tiêu bay thẳng, tốc độ cao, tốc độ ra đòn nhanh.
- Lv2: bắn 3 phi tiêu tỏa hình quạt. Lv3: 5 phi tiêu tỏa.
- Điểm yếu: sát thương mỗi phát thấp, không xuyên mục tiêu.

### 4.2. Fuuka – Quạt chiến (Tessen) · *khống chế đám đông*
- Vung quạt tạo **luồng gió** hình lưỡi liềm, bay chậm, **xuyên qua nhiều kẻ địch**, đẩy lùi địch.
- Luồng gió **to dần** khi bay xa và **chặn được đạn thường** của địch.
- Lv2: luồng gió to hơn. Lv3: phóng 2 luồng đan nhau.
- Điểm yếu: tầm ngắn–trung (tan sau ~0.6 giây), ra đòn chậm.

### 4.3. Hayate – Cung (Yumi) · *tầm xa, sát thương lớn*
- **Nhấn nhanh:** bắn tên thường, bay rất xa.
- **Giữ để gồng:** tên sáng lên, xuyên giáp + xuyên địch, sát thương gấp 3.
- Lv2: tên gồng tách 3 mũi khi trúng đích. Lv3: thời gian gồng giảm một nửa.
- Điểm yếu: bắn chậm, khi gồng di chuyển chậm lại.

### 4.4. Ren – Kunai & đoản đao (Tantō) · *cận chiến, rủi ro cao – phần thưởng cao*
- Ở gần địch (< 40px): **chém đoản đao** sát thương rất lớn, đường chém **phản lại đạn** địch.
- Ở xa: **ném kunai** tầm ngắn.
- Lv2: kunai nổ nhỏ khi cắm vào địch. Lv3: chém tạo thêm sóng kiếm ngắn.
- Kỹ năng **lướt (dash)** ngắn có i-frames để áp sát.
- Điểm yếu: phải áp sát, tầm xa yếu.

### 4.5. Bảng so sánh nhanh

| Nhân vật | Tầm | Sát thương | Tốc độ đánh | Xuyên | Đặc biệt |
|---|---|---|---|---|---|
| Kage (phi tiêu) | Xa | Thấp | Rất nhanh | Không | Tỏa hình quạt |
| Fuuka (quạt) | Trung | Trung | Chậm | Có | Đẩy lùi, chặn đạn |
| Hayate (cung) | Rất xa | Cao (gồng) | Chậm | Khi gồng | Gồng lực |
| Ren (kunai/đao) | Gần | Rất cao | Nhanh | — | Phản đạn, lướt |

> Toàn bộ chỉ số nằm trong `src/data/weapons.ts` để cân bằng mà không sửa code lõi.

---

## 5. Màn chơi, kẻ địch & boss

### 5.1. Màn chơi (thiết kế bằng Tiled)
| Màn | Bối cảnh | Điểm nhấn | Boss |
|---|---|---|---|
| 1 | **Rừng tre đêm trăng** | Màn dạy chơi, sàn nhiều tầng, cầu treo | **Thiết Đầu Đà** – tượng gỗ khổng lồ ném đá, phun lửa |
| 2 | **Làng chài bị chiếm** | Mái nhà, thuyền nổi chòng chành, sàn sập | **Hải Long Thuyền** – thuyền chiến đầu rồng + đại bác |
| 3 | **Pháo đài trên núi lửa** | Băng chuyền, cột lửa, đoạn cuộn dọc lên trên | **Tướng Quân Bóng Tối** – 3 phase, phân thân |

Mỗi file Tiled gồm các lớp:
- `ground` – đất đặc (va chạm 4 mặt)
- `platforms` – sàn mỏng xuyên qua được (chỉ va chạm mặt trên)
- `hazards` – gai, lửa, nước
- `spawns` (object layer) – vị trí + loại địch, kích hoạt khi camera tới gần
- `markers` (object layer) – checkpoint, vùng đấu boss, vị trí rơi vật phẩm

### 5.2. Kẻ địch (chia theo vai trò)
| Loại | Tên | Hành vi |
|---|---|---|
| Lính bộ | **Ashigaru** | Chạy thẳng về phía người chơi, rơi khỏi sàn |
| Lính bắn | **Cung thủ** | Đứng yên, nhắm và bắn tên (nháy cảnh báo trước khi bắn) |
| Ụ cố định | **Tháp nỏ** | Gắn trên tường, xoay 8 hướng, nhiều máu |
| Bay | **Quạ máy** | Bay hình sin rồi lao xuống |
| Nhảy | **Ninja đỏ** | Nhảy qua lại, ném phi tiêu |
| Tự sát | **Thùng thuốc nổ lăn** | Lăn theo dốc, nổ khi chạm |

**Quy tắc telegraph:** mọi đòn nguy hiểm đều có cảnh báo (nháy trắng / đổi tư thế / vệt sáng) **≥ 0.3 giây** trước khi ra đòn.

### 5.3. Boss
- Mỗi boss gồm nhiều **pattern** rời rạc (vd: `throwRocks`, `fireBreath`, `slam`), chọn ngẫu nhiên có trọng số + cooldown.
- Chuyển **phase** theo % máu (100% → 60% → 30%), mỗi phase thêm/đổi pattern.
- Pattern viết bằng **Phaser Timeline / Tween** → mô tả tuần tự "cảnh báo → ra đòn → nghỉ" ngắn gọn, không cần nhiều biến đếm thời gian.
- Khi vào trận boss: khóa camera (`camera.setBounds`), dọn lính thường, hiện thanh máu boss.

### 5.4. Luồng màn chơi (State Machine)
```
Intro → Advancing (cuộn màn) → BossWarning → BossFight → StageClear
                     ↓                            ↓
                  GameOver  ←──────────────────────┘
```
- Camera chỉ tiến, không lùi (như Contra).

---

## 6. Điều khiển trên điện thoại

```
┌──────────────────────────────────────────────────────────┐
│ ♥♥♡  Mạng ×2   Phi tiêu Lv2   ĐIỂM 012340        [II]   │
│                                                          │
│                                                          │
│   ╭─────╮                                  (B)           │
│   │  ●  │  joystick ảo                (A)     (C)        │
│   ╰─────╯  (8 hướng)                                     │
└──────────────────────────────────────────────────────────┘
 A = Tấn công (giữ để đánh liên tục / gồng)   B = Nhảy   C = Kỹ năng (lướt / bom khói)
```
- **HUD:** tim (♥ còn / ♡ mất), số mạng, tên vũ khí + cấp, điểm, nút tạm dừng. Chữ trên HUD là tiếng Việt.
- **Joystick ảo động** (rex VirtualJoystick, chế độ 8 hướng): chạm chỗ nào ở nửa trái màn hình thì joystick hiện ở đó.
- **Đa chạm:** bật `input.addPointer(3)` để vừa di chuyển vừa nhảy vừa đánh.
- Nút trong suốt 40%, kích thước ≥ 64px, có tùy chọn chỉnh vị trí/kích thước.
- **Bàn phím** (test trên PC): mũi tên / WASD – di chuyển, `J` tấn công, `K` nhảy, `L` kỹ năng, `P` tạm dừng.
- **Tay cầm (gamepad):** hỗ trợ sẵn nhờ Phaser, gần như không tốn thêm code.
- Tự động tạm dừng khi ứng dụng mất focus/chạy nền.

---

## 7. Kiến trúc code

### 7.1. Nguyên tắc
1. **Để Phaser lo hạ tầng:** vòng lặp, vật lý, va chạm, camera, hoạt ảnh, âm thanh, scale màn hình – không tự viết lại.
2. **Tách dữ liệu khỏi logic:** chỉ số nhân vật/vũ khí/địch/boss ở `src/data/` (có kiểu TypeScript), bố cục màn ở file Tiled.
3. **Tách Input khỏi hành động:** `InputController` gộp cảm ứng + bàn phím + tay cầm thành một object `InputState` (`moveX`, `aim`, `attack`, `jump`, `skill`). Player chỉ đọc `InputState`.
4. **Pool bằng Phaser Group** (`maxSize`, `get()`, `killAndHide()`) cho đạn, địch, hiệu ứng → không tạo object mới khi đang chơi.
5. **HUD + nút cảm ứng ở `UIScene` riêng**, chạy song song `GameScene` → không bị camera game kéo theo, không lẫn code.
6. **Giao tiếp qua event** của Phaser (`this.events.emit('player-hit')`), tên event khai báo hằng số ở một file.
7. Mỗi file làm **một việc**, ngắn (< 250 dòng), kế thừa tối đa 1 tầng (vd: `Player extends Phaser.Physics.Arcade.Sprite`).
8. **Không viết chữ cứng trong code:** mọi chữ hiển thị nằm trong `src/text/vi.ts`, code gọi theo khóa (vd: `t('menu.start')` → "Bắt đầu"). Sửa câu chữ không cần đụng code, sau này muốn thêm tiếng Anh chỉ cần thêm một file.

### 7.2. Cấu trúc thư mục
```
game/
├── index.html
├── package.json
├── vite.config.ts              # Cấu hình Vite + PWA
├── tsconfig.json
├── public/
│   ├── maps/                   # stage1.json, stage2.json, stage3.json (xuất từ Tiled) + tileset .png
│   ├── sprites/                # spritesheet .png + .json (xuất từ Aseprite/Piskel)
│   ├── audio/                  # sfx .wav (jsfxr), nhạc .ogg (BeepBox)
│   ├── fonts/                  # Font pixel hỗ trợ tiếng Việt (.woff2)
│   └── icons/                  # icon PWA
├── src/
│   ├── main.ts                 # Cấu hình Phaser.Game (pixelArt, Scale.FIT, arcade physics, danh sách scene)
│   ├── constants.ts            # Kích thước màn, độ sâu vẽ, tên event, phím bấm
│   ├── scenes/
│   │   ├── BootScene.ts        # Cài đặt ban đầu, tạo texture tạm
│   │   ├── PreloadScene.ts     # Tải map, sprite, âm thanh, font + thanh tiến trình
│   │   ├── TitleScene.ts
│   │   ├── SelectScene.ts      # Chọn ninja trước mỗi màn
│   │   ├── GameScene.ts        # Màn chơi: dựng map, tạo player, nối các system
│   │   ├── UIScene.ts          # HUD + nút cảm ứng
│   │   ├── PauseScene.ts       # Tạm dừng + cài đặt (âm lượng, rung, vị trí nút)
│   │   └── GameOverScene.ts
│   ├── entities/
│   │   ├── Player.ts           # Trạng thái, di chuyển, hurtbox, i-frames, nhận sát thương
│   │   ├── Projectile.ts       # Một lớp đạn chung, hành vi theo `behavior`
│   │   ├── Enemy.ts            # Một lớp địch chung, hành vi theo `ai`
│   │   ├── Boss.ts             # Máu, phase, chạy pattern
│   │   └── Pickup.ts           # Cuộn bí kíp
│   ├── systems/
│   │   ├── InputController.ts  # Bàn phím + cảm ứng + tay cầm → InputState
│   │   ├── TouchControls.ts    # Joystick rex + nút A/B/C
│   │   ├── WeaponSystem.ts     # Cooldown, gồng, cấp vũ khí, lấy đạn từ pool
│   │   ├── CombatSystem.ts     # Đăng ký overlap, tính sát thương, phản đạn
│   │   ├── SpawnSystem.ts      # Đọc object layer `spawns`, kích hoạt theo camera
│   │   ├── StageFlow.ts        # State machine của màn
│   │   ├── Effects.ts          # Hit-stop, rung màn, nháy, particle nổ, rung điện thoại
│   │   ├── HealthSystem.ts     # Tim, mạng, khiên, hồi sinh, điểm an toàn
│   │   └── SaveSystem.ts       # Điểm cao, cài đặt (localStorage)
│   ├── text/
│   │   ├── vi.ts               # Toàn bộ chữ tiếng Việt trong game
│   │   └── t.ts                # Hàm t('khóa') lấy chữ theo khóa
│   ├── behaviors/
│   │   ├── projectileBehaviors.ts # straight, wind, arrow, kunai, slash
│   │   ├── enemyBehaviors.ts      # walker, shooter, turret, flyer, jumper, roller
│   │   └── bossPatterns.ts        # Mỗi pattern là một hàm nhỏ trả về Timeline
│   ├── core/
│   │   └── StateMachine.ts     # State machine dùng chung (player, màn, boss)
│   └── data/
│       ├── types.ts            # Kiểu dữ liệu: WeaponDef, EnemyDef, CharacterDef...
│       ├── characters.ts
│       ├── weapons.ts
│       ├── enemies.ts
│       ├── bosses.ts
│       └── stages.ts           # Màn → file map, nhạc, boss, nền parallax
└── tests/
    ├── StateMachine.test.ts
    ├── WeaponSystem.test.ts
    └── HealthSystem.test.ts
```

### 7.3. Ví dụ dữ liệu (minh họa định dạng)
```ts
// src/data/weapons.ts
export const weapons: Record<WeaponId, WeaponDef> = {
  shuriken: {
    behavior: 'straight', pierce: false, lifetime: 1.2, sprite: 'shuriken',
    levels: [
      { damage: 1, speed: 360, cooldown: 0.12, count: 1, spread: 0 },
      { damage: 1, speed: 360, cooldown: 0.12, count: 3, spread: 15 },
      { damage: 1, speed: 380, cooldown: 0.10, count: 5, spread: 12 },
    ],
  },
  // fan, bow, kunai ...
};
```
Trong Tiled, một object ở lớp `spawns` chỉ cần thuộc tính `type = "archer"` (có thể thêm `count`, `interval`) – `SpawnSystem` tự đọc và tạo địch.

### 7.4. Trạng thái Player
`Idle → Run → Jump/Fall → Prone → Dash (Ren) → Hurt → Dead → Respawn`
Chuyển trạng thái chỉ dựa trên `InputState` + `body.blocked.down` của Arcade Physics, tránh `if` lồng nhau.

### 7.5. Những điểm kỹ thuật đáng chú ý
- **Sàn xuyên qua:** tile lớp `platforms` chỉ bật va chạm mặt trên; nhảy xuống = tắt collider với lớp đó trong ~0.25 giây.
- **Hurtbox:** chỉnh `body.setSize()` nhỏ hơn hình vẽ (~60%); khi nằm sấp thì hạ thấp hitbox (né được đạn ngang ngực như Contra).
- **Đạn nhanh không xuyên mục tiêu:** giới hạn tốc độ tối đa so với độ dày mục tiêu, bật `physics.arcade.fps` cao hơn nếu cần.
- **Hit-stop:** tạm dừng `physics.world` + `anims` 40–60ms; rung/nháy dùng `camera.shake()` / `camera.flash()` có sẵn.
- **Rung điện thoại:** `navigator.vibrate()` (Android); bật/tắt trong cài đặt.
- **Chữ tiếng Việt:**
  - Chờ font tải xong (trong `PreloadScene`) rồi mới tạo chữ, nếu không dấu sẽ hiển thị sai hoặc bị đổi sang font mặc định.
  - Màn hình logic chỉ 480×270 nên chữ có dấu dễ bị vỡ: cỡ chữ tối thiểu ~12px logic, vẽ chữ ở độ phân giải cao hơn (`setResolution`) để dấu sắc/huyền/hỏi/ngã/nặng rõ ràng.
  - Câu chữ ngắn gọn để vừa nút bấm và HUD.
- **Điểm an toàn khi rơi vực:** `HealthSystem` ghi lại vị trí cuối cùng player đứng vững trên đất; rơi vực thì đưa player về đó.

---

## 8. Đồ họa (tự sáng tạo)

- **Phong cách:** pixel-art 16-bit, tông màu đêm (xanh tím than, đỏ son, vàng trăng).
- **Nhân vật:** 24×32 px, mỗi ninja có **màu khăn/đai riêng**: Kage – xanh dương, Fuuka – hồng đào, Hayate – xanh lá, Ren – đỏ.
- **Hoạt ảnh:** đứng (2 frame), chạy (4), nhảy xoay (4), nằm (1), tấn công (2), chết (3). Khai báo bằng `anims.create` từ spritesheet.
- **Quy trình 2 bước:**
  1. **Giai đoạn đầu:** dùng hình tạm (khối màu, sinh bằng `Graphics.generateTexture` trong `BootScene`) → chơi thử được ngay, không chờ vẽ.
  2. **Giai đoạn đồ họa:** vẽ spritesheet thật bằng Aseprite/Piskel, thay vào `public/sprites/`. Code không đổi vì chỉ tham chiếu tên texture/animation.
- **Nền parallax** 3 lớp bằng `TileSprite` + `setScrollFactor`.
- **Hiệu ứng:** particle emitter của Phaser cho nổ, bụi, lá tre rơi, tro núi lửa (giới hạn số hạt).

---

## 9. Lộ trình triển khai

Mỗi giai đoạn kết thúc bằng một bản **chơi được trên điện thoại** (mở qua `npm run dev -- --host` cùng mạng Wi-Fi).

| # | Giai đoạn | Nội dung | Kết quả kiểm tra |
|---|---|---|---|
| 0 | **Khởi tạo** | Vite + TypeScript + Phaser, ESLint/Prettier, Vitest, scale 480×270, scene khung, hình tạm, font tiếng Việt, file `vi.ts` | Mở được trên điện thoại, hiển thị đúng tỷ lệ, chữ có dấu rõ ràng |
| 1 | **Di chuyển** | Map thử trong Tiled, Player, chạy/nhảy/nằm/rơi xuyên sàn, camera bám | Chạy nhảy mượt trên map thử |
| 2 | **Điều khiển** | InputController, joystick 8 hướng, nút A/B/C, bàn phím, tay cầm | Điều khiển thoải mái trên điện thoại thật |
| 3 | **Vũ khí** | WeaponSystem + 4 vũ khí Lv1, pool đạn | Cảm nhận rõ 4 kiểu tấn công khác nhau |
| 4 | **Kẻ địch & tim** | 6 loại địch, SpawnSystem đọc Tiled, telegraph, HealthSystem (3 tim, mạng, điểm an toàn, i-frames) | Màn 1 chơi tới trước boss |
| 5 | **Boss & luồng màn** | StageFlow, boss màn 1, UIScene (HUD tim/mạng/điểm + máu boss) | Hoàn thành trọn màn 1 |
| 6 | **Vật phẩm** | Cuộn nâng cấp Lv2/Lv3, cơm nắm, khiên, bom khói, cân bằng 4 nhân vật | Mỗi nhân vật đều qua được màn 1 |
| 7 | **Nội dung** | Màn 2, 3 + 2 boss, màn Chọn Ninja trước mỗi màn, màn tiêu đề, màn Thua cuộc / Chơi tiếp | Chơi hết game với cả 4 ninja |
| 8 | **Đồ họa & âm thanh** | Spritesheet thật, nền parallax, sfx jsfxr, nhạc BeepBox | Game có diện mạo hoàn chỉnh |
| 9 | **Đánh bóng & QA** | Game feel, tối ưu, PWA, cài đặt, rà soát câu chữ tiếng Việt, sửa lỗi theo checklist | 60 FPS ổn định, qua checklist test |

Các giai đoạn tương ứng với các skill trong `.claude/skills/`:
- GĐ 1–3 → `contra-core-combat.md`
- GĐ 4–5, 7 → `contra-stage-enemy-boss.md`
- GĐ 9 → `contra-mobile-polish-qa.md`

---

## 10. Thông số cân bằng ban đầu (tinh chỉnh trên máy thật)

| Thông số | Giá trị khởi điểm |
|---|---|
| Tốc độ chạy | 90 px/s |
| Lực nhảy / trọng lực | 300 px/s / 900 px/s² |
| Số tim mỗi mạng / số mạng | 3 / 3 |
| i-frames sau khi trúng đòn | 1.5 s |
| i-frames sau hồi sinh | 2.0 s |
| Lực đẩy lùi khi trúng đòn | 80 px/s ngang, 150 px/s lên |
| Tỷ lệ rơi cơm nắm | ~1 cái mỗi 1/3 màn + 1 cái trước boss |
| Thời gian telegraph tối thiểu | 0.3 s |
| Tốc độ đạn địch | 100–140 px/s (chậm hơn đạn người chơi để kịp né) |
| Giới hạn pool | 64 đạn người chơi, 48 đạn địch, 24 địch, 96 hạt hiệu ứng |
| Gồng cung | 0.8 s (Lv3: 0.4 s) |
| Tầm chém đoản đao | 40 px, cooldown 0.25 s |
| Lướt (Ren) | 120 px trong 0.15 s, cooldown 0.8 s |
| Hit-stop | 50 ms |

---

## 11. Checklist kiểm thử

- [ ] Bắn đủ 8 hướng, kể cả chéo khi đang chạy và đang nhảy
- [ ] Rơi xuyên sàn mỏng không bị kẹt, không rơi xuyên đất đặc
- [ ] Đạn nhanh không xuyên qua địch mỏng
- [ ] Trúng nhiều đòn cùng lúc chỉ mất 1 tim (nhờ i-frames)
- [ ] Hết 3 tim → mất 1 mạng, hồi sinh đầy tim; hết mạng → màn Thua cuộc / Chơi tiếp
- [ ] Rơi vực → mất 1 tim và về đúng điểm an toàn, không bị kẹt trong tường
- [ ] Khiên chặn đúng 1 đòn; cơm nắm không hồi quá 3 tim
- [ ] Đổi ninja ở màn sau vẫn giữ cấp vũ khí
- [ ] Chết / tạm dừng / qua màn / chơi lại không bị kẹt trạng thái
- [ ] Object lấy lại từ pool được reset sạch (máu, vận tốc, tint, trạng thái)
- [ ] Điều khiển 2–3 ngón cùng lúc trên điện thoại thật
- [ ] Nút bấm không che tầm nhìn quan trọng
- [ ] Tự tạm dừng khi chuyển app, quay lại chơi tiếp bình thường
- [ ] Giữ 60 FPS khi màn hình đầy đạn + nổ liên hoàn
- [ ] Màn hình tai thỏ, tỷ lệ 18:9, 20:9, iPad đều hiển thị đúng
- [ ] Chữ tiếng Việt hiển thị đủ dấu, không vỡ nét trên mọi màn hình; không còn chữ cứng ngoài `vi.ts`
- [ ] Test tự động (Vitest) chạy qua hết
