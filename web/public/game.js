/**
 * 贪吃蛇的核心游戏逻辑 —— game.py 的 JavaScript 版本。
 *
 * 这个文件里没有一行代码碰过浏览器：不操作 DOM、不画图、不读键盘。
 * 所以它既能在浏览器里被 main.js 使用，也能被 node --test 直接测试。
 *
 * 对照 python-prototype/game.py 读会有意思：同一套规则，两种语言
 * 各自的写法、各自的坑。
 */

export const DIRECTIONS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

export const GameState = {
  READY: "READY",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  GAME_OVER: "GAME_OVER",
};

export const Death = { WALL: "wall", SELF: "self" };

export const SCORE_PER_FOOD = 10;

/**
 * 把坐标转成字符串，用来当集合的键。
 *
 * 这里藏着 Python 和 JS 最本质的差异之一：
 * Python 的元组 (1, 2) 可以直接塞进 set，两个值相等就算同一个元素。
 * JS 的数组不行 —— [1, 2] !== [1, 2]，它们是两个不同的对象，
 * 哪怕内容一模一样。所以 JS 里判断「这个格子占没占」，
 * 得先把坐标转成 "1,2" 这种字符串。
 */
export const keyOf = ([x, y]) => `${x},${y}`;

/** 两个坐标是不是同一个格子。注意先判 null —— 食物可能不存在。 */
export const sameCell = (a, b) =>
  a !== null && b !== null && a[0] === b[0] && a[1] === b[1];

/**
 * 一个可以指定种子的小型随机数发生器。
 *
 * JS 自带的 Math.random() 没法指定种子，也就是说它不可复现 ——
 * 测试里没法断言「第 3 步会吃到食物」。Python 的 random.Random(seed)
 * 天生支持这件事，JS 得自己写一个。下面是 mulberry32，十几行就够。
 */
function createRng(seed) {
  if (seed === null || seed === undefined) return Math.random;

  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Snake {
  constructor({ start = [5, 5], direction = "right", length = 3 } = {}) {
    if (!Object.hasOwn(DIRECTIONS, direction)) {
      throw new Error(`未知方向：${direction}`);
    }
    if (length < 1) throw new Error("蛇至少要有 1 节");

    this.direction = direction;
    // 玩家按下的新方向先存这里，真正移动时才生效。
    // 两个变量是必须的：只有一个的话，玩家一帧内连按两下方向键，
    // 蛇会瞬间掉头撞死自己。
    this.nextDirection = direction;

    // 身体从蛇头往「身后」排开。身后 = 前进方向的反方向。
    const [dx, dy] = DIRECTIONS[direction];
    const [headX, headY] = start;
    this.body = [];
    for (let i = 0; i < length; i += 1) {
      this.body.push([headX - dx * i, headY - dy * i]);
    }
  }

  get head() {
    return this.body[0];
  }

  get tail() {
    return this.body[this.body.length - 1];
  }

  get length() {
    return this.body.length;
  }

  /** 记录想转的方向。和当前方向相反（掉头）的输入直接忽略。 */
  turn(direction) {
    if (!Object.hasOwn(DIRECTIONS, direction)) {
      throw new Error(`未知方向：${direction}`);
    }
    if (direction === OPPOSITE[this.direction]) return;
    this.nextDirection = direction;
  }

  /** 按下一步方向算出的新蛇头位置 —— 此时蛇还没真的移动。 */
  nextHead() {
    const [dx, dy] = DIRECTIONS[this.nextDirection];
    return [this.head[0] + dx, this.head[1] + dy];
  }

  /** 往前走一步。grow=true 时不砍尾巴，蛇就长了一节。 */
  step(grow = false) {
    this.direction = this.nextDirection;
    const newHead = this.nextHead();

    this.body.unshift(newHead);
    if (!grow) this.body.pop();

    return newHead;
  }
}

export class Game {
  constructor({
    width = 20,
    height = 20,
    start = [5, 5],
    direction = "right",
    length = 3,
    seed = null,
  } = {}) {
    if (width < 2 || height < 2) throw new Error("棋盘至少要有 2x2");

    this.width = width;
    this.height = height;
    this.score = 0;
    this.rng = createRng(seed);

    // 记下开局参数，重开时要用
    this.startPosition = start;
    this.startDirection = direction;
    this.startLength = length;

    this.snake = new Snake({ start, direction, length });
    this.food = null;
    this.state = GameState.READY;
    this.death = null;
    this.spawnFood();
  }

  /** 蛇占满整个棋盘算通关 —— 理论可行，实战几乎遇不到。 */
  get hasWon() {
    return this.food === null;
  }

  /** 棋盘上所有还没被蛇占的格子。 */
  freeCells() {
    const occupied = new Set(this.snake.body.map(keyOf));
    const free = [];
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (!occupied.has(`${x},${y}`)) free.push([x, y]);
      }
    }
    return free;
  }

  /** 把食物随机放到一个空格子上。占满了则返回 null（通关）。 */
  spawnFood() {
    const free = this.freeCells();
    if (free.length === 0) {
      this.food = null;
      return null;
    }
    this.food = free[Math.floor(this.rng() * free.length)];
    return this.food;
  }

  /**
   * 推进一帧，返回这一步是否吃到了食物。
   *
   * 顺序不能换：先算头要去哪 → 判断吃没吃到 → 判断会不会死 → 最后才动。
   * 反过来先移动的话，蛇头已经站在食物格子上了，你就分不清它是刚到的
   * 还是本来就在那。
   */
  step() {
    if (this.state !== GameState.RUNNING) return false;

    const nextHead = this.snake.nextHead();
    const ate = sameCell(nextHead, this.food);

    const death = this.collisionAt(nextHead, ate);
    if (death !== null) {
      this.state = GameState.GAME_OVER;
      this.death = death;
      return false;
    }

    this.snake.step(ate);
    if (ate) {
      this.score += SCORE_PER_FOOD;
      this.spawnFood();
    }

    return ate;
  }

  /**
   * 检查走到 position 会不会死。安全则返回 null。
   *
   * growing=true 表示这一步会吃到食物、尾巴不会让开。
   */
  collisionAt(position, growing = false) {
    const [x, y] = position;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return Death.WALL;
    }

    const blocking = new Set(this.snake.body.map(keyOf));
    if (!growing) {
      // 这一步尾巴会让开身后那一格，所以「头撞到自己的尾巴尖」不算死。
      blocking.delete(keyOf(this.snake.tail));
    }

    return blocking.has(keyOf(position)) ? Death.SELF : null;
  }

  start() {
    if (this.state === GameState.READY) this.state = GameState.RUNNING;
  }

  togglePause() {
    if (this.state === GameState.RUNNING) this.state = GameState.PAUSED;
    else if (this.state === GameState.PAUSED) this.state = GameState.RUNNING;
  }

  /** 重开一局。重新造一条蛇，比逐个字段改回去可靠。 */
  reset() {
    this.score = 0;
    this.death = null;
    this.snake = new Snake({
      start: this.startPosition,
      direction: this.startDirection,
      length: this.startLength,
    });
    this.food = null;
    this.spawnFood();
    this.state = GameState.READY;
  }
}
