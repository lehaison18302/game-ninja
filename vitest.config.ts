import { defineConfig } from 'vitest/config';

// Cấu hình riêng để không nạp plugin PWA khi chạy test (logic thuần, không cần Phaser/trình duyệt).
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
