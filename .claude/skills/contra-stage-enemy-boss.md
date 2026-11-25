# SKILL: CONTRA STAGE, ENEMIES & BOSS FLOW

## Mục tiêu
Tạo hệ thống màn chơi, spawn kẻ địch theo tiến trình/camera và boss/miniboss có pattern rõ ràng, dễ đọc trên màn hình dọc/ngang nhỏ của điện thoại.

## Yêu cầu bắt buộc
1. **Camera & Progression Flow**
   - Quản lý luồng màn chơi bằng State Machine rõ ràng (`Intro`, `Scrolling/Advancing`, `BossWarning`, `BossFight`, `StageClear`, `GameOver`).
   - Kiểm soát giới hạn camera tiến/lùi hợp lý; khi vào `BossFight`, khóa ranh giới camera và dọn/dừng các wave lính thường không cần thiết để tránh rối màn hình mobile.

2. **Enemies & Telegraphing**
   - Chia kẻ địch theo vai trò rõ ràng (lính đi bộ/nhảy, turret/ụ súng cố định, drone/quái bay) dùng chung state machine hoặc hành vi gọn nhẹ.
   - Mọi đòn tấn công nguy hiểm của enemy hoặc boss đều phải có **telegraph** (nháy cảnh báo, đổi tư thế/nòng súng, âm thanh/hiệu ứng ngắn trước khi bắn/lao) để người chơi mobile kịp phản xạ trên màn hình nhỏ.

3. **Boss Pattern**
   - Chia boss thành các phase/pattern rời rạc, có cooldown và điều kiện chuyển phase rõ ràng (theo % máu hoặc thời gian), dễ thêm bớt pattern mới mà không phình code.

## Output mong muốn
- Code cấu trúc sạch, tách biệt logic AI/pattern và phần hiển thị/hiệu ứng.
- Giải thích ngắn gọn từng state/pattern của enemy hoặc boss và cách cấu hình dữ liệu wave/stage.
- Chỉ ra điểm nghẽn hiệu năng tiềm ẩn khi nhiều đạn + nhiều enemy cùng xuất hiện trên mobile và cách tránh.