/** State machine nhỏ dùng chung (player, màn chơi, boss). */
export interface State<C> {
  enter?(ctx: C, prev: string | null): void;
  update?(ctx: C, time: number, delta: number): void;
  exit?(ctx: C, next: string): void;
}

export class StateMachine<C, S extends string = string> {
  private states = new Map<S, State<C>>();
  private currentName: S | null = null;
  /** Thời điểm (ms, theo `now`) vào state hiện tại. */
  enteredAt = 0;

  constructor(
    private ctx: C,
    private now: () => number = () => performance.now(),
  ) {}

  add(name: S, state: State<C>): this {
    this.states.set(name, state);
    return this;
  }

  get current(): S | null {
    return this.currentName;
  }

  is(name: S): boolean {
    return this.currentName === name;
  }

  /** Thời gian đã ở trong state hiện tại (ms). */
  get elapsed(): number {
    return this.now() - this.enteredAt;
  }

  set(name: S): void {
    if (name === this.currentName) return;
    const next = this.states.get(name);
    if (!next) throw new Error(`StateMachine: không có state "${name}"`);
    const prevName = this.currentName;
    if (prevName !== null) this.states.get(prevName)?.exit?.(this.ctx, name);
    this.currentName = name;
    this.enteredAt = this.now();
    next.enter?.(this.ctx, prevName);
  }

  update(time: number, delta: number): void {
    if (this.currentName !== null) {
      this.states.get(this.currentName)?.update?.(this.ctx, time, delta);
    }
  }
}
