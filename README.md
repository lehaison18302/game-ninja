# Ninja Phong Ảnh

Game hành động màn hình ngang (run-and-gun) chạy trên trình duyệt điện thoại. Chi tiết thiết kế: [PLAN.md](PLAN.md).

## Chạy

```bash
npm install
npm run dev        # mở bằng điện thoại cùng Wi-Fi: địa chỉ "Network" mà Vite in ra
npm run test       # Vitest (logic thuần)
npm run lint
npm run build      # kiểm tra kiểu + đóng gói PWA vào dist/
```

Phím trên PC: mũi tên/WASD di chuyển + ngắm 8 hướng, `J` đánh, `K` nhảy, `L` kỹ năng, `P`/`Esc` tạm dừng.
Xuống + `K` khi đứng trên sàn mỏng = nhảy xuyên sàn.

## Sinh lại asset tạm

`node tools/genAssets.mjs` ghi lại icon PWA, `public/maps/tiles.png` và 3 map Tiled (`stage1..3.json`).
Mở các map bằng Tiled để chỉnh; lớp `spawns` (địch, đèn lồng mang đồ) và `markers` (điểm xuất phát, khu boss,
sàn sập, thuyền, băng chuyền, cột lửa) đọc trực tiếp từ file. Nếu chỉnh bằng Tiled thì **đừng** chạy lại script
(sẽ ghi đè).

## Thay hình/âm thanh thật

- Hình tạm sinh bằng code trong `src/core/placeholderTextures.ts` và `placeholderStages.ts`
  (tên texture: `ninja-<id>`, `enemy-*`, `boss-*`, `p-*`, `e-*`, `item-*`, `bg*`…). Nạp spritesheet cùng tên là thay được.
- Âm thanh được tổng hợp bằng code (`src/audio/`), chỉnh thông số trong `AudioSystem.ts`.
- Cân bằng: `src/data/` (`weapons.ts`, `enemies.ts`, `bosses.ts`, `characters.ts`) và `src/constants.ts` (`PLAYER`, `POOL`).
- Chữ hiển thị: duy nhất `src/text/vi.ts`.
