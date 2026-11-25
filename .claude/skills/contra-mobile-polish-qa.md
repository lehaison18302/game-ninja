# SKILL: CONTRA MOBILE JUICE, OPTIMIZATION & QA

## Mục tiêu
Rà soát lỗi gameplay đặc thù của game run-and-gun, thêm game feel gọn nhẹ và tối ưu hiệu năng để giữ 60 FPS ổn định trên máy mobile tầm trung.

## Yêu cầu bắt buộc
1. **Audit Bug Đặc Thù Run-and-Gun**
   - Kiểm tra các lỗi kinh điển: đạn bay quá nhanh xuyên qua mục tiêu mỏng (tunneling), kẹt trạng thái khi chết/pause/đổi màn, object không reset trạng thái khi tái sử dụng từ Pool, UI nút bấm che khuất tầm nhìn hoặc kẹt multi-touch.
   - Chỉ sửa đúng nguyên nhân gốc trong phạm vi liên quan, không refactor lan man.

2. **Mobile-Safe Game Feel**
   - Thêm hit-stop rất ngắn, camera shake nhẹ, flash khi trúng đòn, hiệu ứng nổ/văng mảnh từ pool và rung phản hồi (haptic) có thể bật/tắt trong Settings.
   - Đảm bảo mọi hiệu ứng có giới hạn số lượng/thời gian tồn tại để không tụt FPS khi nổ liên hoàn.

3. **Performance & Lifecycle Check**
   - Rà soát vòng lặp frame/physics xem có cấp phát bộ nhớ, tìm kiếm node/component hoặc log/tính toán thừa không.
   - Kiểm tra xử lý pause/resume/auto-save khi ứng dụng ra nền hoặc mất focus.

## Output mong muốn
- Danh sách lỗi/điểm nghẽn tìm thấy (phân loại mức độ nghiêm trọng) kèm bản vá code hoàn chỉnh.
- Checklist test thực tế trên màn hình cảm ứng (điều khiển 2 ngón, xoay/đổi tỷ lệ màn hình, pause đột ngột khi đang đấu boss).