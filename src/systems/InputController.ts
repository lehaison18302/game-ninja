import Phaser from 'phaser';

/** Trạng thái điều khiển đã gộp từ bàn phím + cảm ứng + tay cầm. Player/WeaponSystem chỉ đọc cái này. */
export interface InputState {
  /** Hướng đang giữ (8 hướng): -1/0/1; y âm = lên. */
  dirX: number;
  dirY: number;
  attack: boolean;
  attackPressed: boolean;
  attackReleased: boolean;
  jump: boolean;
  jumpPressed: boolean;
  jumpReleased: boolean;
  skill: boolean;
  skillPressed: boolean;
  pausePressed: boolean;
}

/** Cầu nối từ TouchControls (UIScene) sang InputController (GameScene). */
export const touchInput = {
  dirX: 0,
  dirY: 0,
  attack: false,
  jump: false,
  skill: false,
  pause: false,
};

export function resetTouchInput(): void {
  touchInput.dirX = 0;
  touchInput.dirY = 0;
  touchInput.attack = false;
  touchInput.jump = false;
  touchInput.skill = false;
  touchInput.pause = false;
}

const STICK_DEADZONE = 0.45;

export class InputController {
  readonly state: InputState = {
    dirX: 0,
    dirY: 0,
    attack: false,
    attackPressed: false,
    attackReleased: false,
    jump: false,
    jumpPressed: false,
    jumpReleased: false,
    skill: false,
    skillPressed: false,
    pausePressed: false,
  };

  private keys: Record<
    | 'left'
    | 'right'
    | 'up'
    | 'down'
    | 'a'
    | 'd'
    | 'w'
    | 's'
    | 'attack'
    | 'jump'
    | 'skill'
    | 'pause'
    | 'esc',
    Phaser.Input.Keyboard.Key
  > | null = null;
  private prevAttack = false;
  private prevJump = false;
  private prevSkill = false;
  private prevPause = false;

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.keys = {
        left: kb.addKey(K.LEFT),
        right: kb.addKey(K.RIGHT),
        up: kb.addKey(K.UP),
        down: kb.addKey(K.DOWN),
        a: kb.addKey(K.A),
        d: kb.addKey(K.D),
        w: kb.addKey(K.W),
        s: kb.addKey(K.S),
        attack: kb.addKey(K.J),
        jump: kb.addKey(K.K),
        skill: kb.addKey(K.L),
        pause: kb.addKey(K.P),
        esc: kb.addKey(K.ESC),
      };
    }
  }

  /** Gọi mỗi frame, trước khi Player/WeaponSystem cập nhật. */
  update(): void {
    const s = this.state;
    let dx = 0;
    let dy = 0;
    let attack = touchInput.attack;
    let jump = touchInput.jump;
    let skill = touchInput.skill;
    let pause = touchInput.pause;

    const k = this.keys;
    if (k) {
      dx += (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
      dy += (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
      attack = attack || k.attack.isDown;
      jump = jump || k.jump.isDown;
      skill = skill || k.skill.isDown;
      pause = pause || k.pause.isDown || k.esc.isDown;
    }

    dx += touchInput.dirX;
    dy += touchInput.dirY;

    const pad = this.scene.input.gamepad?.pad1;
    if (pad && pad.connected) {
      const ax = pad.leftStick.x;
      const ay = pad.leftStick.y;
      dx += (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
      dy += (pad.down ? 1 : 0) - (pad.up ? 1 : 0);
      if (Math.abs(ax) > STICK_DEADZONE) dx += Math.sign(ax);
      if (Math.abs(ay) > STICK_DEADZONE) dy += Math.sign(ay);
      const b = pad.buttons;
      jump = jump || !!b[0]?.pressed;
      skill = skill || !!b[1]?.pressed;
      attack = attack || !!b[2]?.pressed || !!b[7]?.pressed;
      pause = pause || !!b[9]?.pressed;
    }

    s.dirX = Phaser.Math.Clamp(dx, -1, 1);
    s.dirY = Phaser.Math.Clamp(dy, -1, 1);

    s.attack = attack;
    s.attackPressed = attack && !this.prevAttack;
    s.attackReleased = !attack && this.prevAttack;
    s.jump = jump;
    s.jumpPressed = jump && !this.prevJump;
    s.jumpReleased = !jump && this.prevJump;
    s.skill = skill;
    s.skillPressed = skill && !this.prevSkill;
    s.pausePressed = pause && !this.prevPause;

    this.prevAttack = attack;
    this.prevJump = jump;
    this.prevSkill = skill;
    this.prevPause = pause;
  }

  /** Xoá cạnh bấm/nhả (dùng khi tiếp tục sau tạm dừng để không bị "nhả" giả). */
  reset(): void {
    this.prevAttack = this.prevJump = this.prevSkill = this.prevPause = false;
    const s = this.state;
    s.dirX = s.dirY = 0;
    s.attack = s.jump = s.skill = false;
    s.attackPressed = s.attackReleased = s.jumpPressed = s.jumpReleased = false;
    s.skillPressed = s.pausePressed = false;
  }
}
