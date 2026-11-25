/** Toàn bộ chữ hiển thị trong game (tiếng Việt). Không viết chữ cứng ở nơi khác. */
export const vi = {
  'game.title': 'NINJA PHONG ẢNH',
  'game.subtitle': 'Nhẫn giả truyền kỳ',

  'boot.loading': 'Đang tải…',
  'boot.landscape': 'Hãy xoay ngang màn hình',

  'menu.start': 'Bắt đầu',
  'menu.tapToStart': 'Chạm để bắt đầu',
  'menu.highScore': 'Điểm cao',
  'menu.mainMenu': 'Màn hình chính',
  'menu.back': 'Quay lại',

  'pause.title': 'Tạm dừng',
  'pause.resume': 'Tiếp tục',
  'pause.sound': 'Âm thanh',
  'pause.vibrate': 'Rung',
  'pause.touchSize': 'Cỡ nút',
  'pause.on': 'Bật',
  'pause.off': 'Tắt',
  'pause.restart': 'Chơi lại màn',

  'hud.lives': 'Mạng',
  'hud.score': 'Điểm',
  'hud.warning': 'CẢNH BÁO!',
  'hud.stageClear': 'QUA MÀN!',
  'hud.noHitBonus': 'Thưởng không mất tim',
  'hud.bonus': 'Điểm thưởng',

  'select.title': 'Chọn ninja',
  'select.go': 'Vào trận',
  'select.range': 'Tầm',
  'select.damage': 'Sát thương',
  'select.speed': 'Tốc độ đánh',
  'select.pierce': 'Xuyên',
  'select.yes': 'Có',
  'select.no': 'Không',
  'select.hint': 'Chạm vào ninja để chọn',

  'victory.title': 'Chiến thắng!',
  'victory.sub': 'Bóng tối đã tan. Phong Ảnh trở lại.',

  'gameover.title': 'Thua cuộc',
  'gameover.score': 'Điểm',
  'gameover.retry': 'Chơi tiếp',
  'gameover.menu': 'Màn hình chính',
  'gameover.newRecord': 'Kỷ lục mới!',

  'stage.1': 'Màn 1: Rừng tre đêm trăng',
  'stage.2': 'Màn 2: Làng chài bị chiếm',
  'stage.3': 'Màn 3: Pháo đài núi lửa',

  'touch.attack': 'Đánh',
  'touch.jump': 'Nhảy',
  'touch.skill': 'Kỹ năng',

  'char.kage': 'Kage',
  'char.fuuka': 'Fuuka',
  'char.hayate': 'Hayate',
  'char.ren': 'Ren',
  'char.kage.desc': 'Cân bằng, dễ chơi. Phi tiêu bay nhanh, tỏa hình quạt.',
  'char.fuuka.desc': 'Khống chế đám đông. Gió xuyên địch, chặn đạn.',
  'char.hayate.desc': 'Tầm xa. Giữ nút đánh để gồng tên xuyên giáp.',
  'char.ren.desc': 'Cận chiến. Chém phản đạn, lướt né.',

  'weapon.shuriken': 'Phi tiêu',
  'weapon.tessen': 'Quạt chiến',
  'weapon.yumi': 'Cung',
  'weapon.tanto': 'Đoản đao',
  'weapon.level': 'Lv',

  'item.upgrade': 'Cuộn nâng cấp',
  'item.rice': 'Cơm nắm',
  'item.shield': 'Khiên Ki',
  'item.smoke': 'Bom khói',

  'boss.stage1': 'Thiết Đầu Đà',
  'boss.stage2': 'Hải Long Thuyền',
  'boss.stage3': 'Tướng Quân Bóng Tối',
} as const;

export type TextKey = keyof typeof vi;
