import type Phaser from 'phaser';
import { GAME_H, GAME_W, RENDER_SCALE } from '../constants';

/**
 * Canvas lớn hơn logic RENDER_SCALE lần → camera zoom (quanh tâm).
 * Với zoom quanh tâm, vùng nhìn thấy (worldView) bắt đầu ở scroll + OFF.
 */
export const CAM_OFF_X = (GAME_W * (RENDER_SCALE - 1)) / 2;
export const CAM_OFF_Y = (GAME_H * (RENDER_SCALE - 1)) / 2;

export function initCamera(cam: Phaser.Cameras.Scene2D.Camera): void {
  cam.setZoom(RENDER_SCALE);
  setCamView(cam, 0, 0);
}

/** Đặt góc trái-trên của vùng nhìn (toạ độ logic). */
export function setCamView(cam: Phaser.Cameras.Scene2D.Camera, left: number, top: number): void {
  cam.setScroll(left - CAM_OFF_X, top - CAM_OFF_Y);
}
