# SKILL: CONTRA CORE COMBAT & MOVEMENT

## Mục tiêu
Xây dựng cơ chế chạy - nhảy - bắn - đổi súng mượt mà, phản xạ nhanh cho màn hình cảm ứng mobile, giữ nguyên nguyên tắc tách logic khỏi view và không cấp phát bộ nhớ trong frame loop.

## Yêu cầu bắt buộc
1. **Controller & Input Mobile**
   - Hỗ trợ di chuyển trái/phải, aim/bắn 8 hướng (8-way: lên, xuống, trái, phải, và 4 hướng chéo), nút nhảy, nút đổi vũ khí / dodge/roll (nếu có).
   - Xử lý mượt chuyển đổi giữa đứng yên, chạy, nằm bắn (prone), nhảy, rơi xuống platform xuyên qua được (drop-through one-way platform) và bám/leo (nếu có).
   - Tách riêng Input State khỏi Physics/Combat State để dễ tinh chỉnh độ nhạy nút ảo/joystick.

2. **Weapon & Projectile System**
   - Cấu hình từng loại súng bằng data (tốc độ đạn, sát thương, khoảng cách/thời gian sống, cooldown, số tia/góc tỏa, kiểu bay) để dễ cân bằng mà không phải sửa code core.
   - Mọi viên đạn, vỏ đạn, tia lửa đầu nòng bắt buộc lấy từ Object Pool.
   - Đạn ra khỏi ranh giới camera/màn hình hoặc chạm vật cản phải trả về pool ngay lập tức.

3. **Hitbox, Hurtbox & Invulnerability**
   - Tách rõ vùng gây sát thương (hitbox) và vùng nhận sát thương (hurtbox) cho cả Player và Enemy.
   - Khi Player trúng đòn: kích hoạt invulnerability frames (i-frames) ngắn + nháy sprite/feedback rõ ràng để tránh mất nhiều mạng trong 1 tích tắc, phát event `OnPlayerHit` / `OnPlayerDied`.

## Output mong muốn
- Code hoàn chỉnh, không để `// TODO` rỗng, giữ giải pháp đơn giản nhất đáp ứng yêu cầu.
- Liệt kê các thông số tune gameplay (tốc độ chạy, lực nhảy, fire rate, thời gian i-frames...) để dễ cân bằng trên thiết bị thật.
- Nêu rõ cách nối node/component/signal/event và kịch bản test tay nhanh (bắn chéo, rớt xuyên sàn, đổi súng khi đang bắn, trúng đạn liên tiếp).