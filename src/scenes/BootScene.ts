import Phaser from 'phaser';
import { audio } from '../audio/AudioSystem';
import { FONT_FAMILY } from '../constants';
import { makePlaceholderTextures } from '../core/placeholderTextures';

/** Chữ mẫu có đủ các dấu tiếng Việt để trình duyệt tải đúng các phần (subset) của font. */
const VI_SAMPLE = 'ĂÂÊÔƠƯĐăâêôơưđ ÁÀẢÃẠ ếềểễệ ốồổỗộ ớờởỡợ ứừửữự ýỳỷỹỵ ABCabc0123';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    audio.init(this.game);
    makePlaceholderTextures(this);
    // Chờ font tải xong rồi mới tạo chữ, nếu không dấu sẽ bị đổi sang font mặc định.
    const fonts = document.fonts;
    const ready = fonts
      ? Promise.race([
          fonts.load(`16px ${FONT_FAMILY}`, VI_SAMPLE),
          new Promise((res) => setTimeout(res, 4000)),
        ])
      : Promise.resolve();
    ready.catch(() => undefined).then(() => this.scene.start('PreloadScene'));
  }
}
