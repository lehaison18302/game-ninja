import { vi, type TextKey } from './vi';

/** Lấy chữ theo khóa. Thêm ngôn ngữ khác = thêm một file bảng chữ và đổi `dict`. */
const dict: Record<TextKey, string> = vi;

export function t(key: TextKey): string {
  return dict[key];
}
