/**
 * 网页版游戏逻辑的测试。
 *
 * 用的是 Node 自带的测试运行器（node --test），不用装任何第三方库。
 * 这一点值得注意：JavaScript 世界不一定非得装一堆东西才能写测试。
 *
 * 运行：
 *     npm test
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  Death,
  DIRECTIONS,
  Game,
  GameState,
  SCORE_PER_FOOD,
  Snake,
  keyOf,
} from "../public/game.js";

// 棋盘外的坐标，拿来当「不存在的食物」，排除随机因素干扰
const OUTSIDE = [-1, -1];

function makeGame(overrides = {}) {
  const game = new Game({ ...overrides });
  game.food = OUTSIDE;
  return game;
}

function drive(game, turns) {
  for (const direction of turns) {
    game.snake.turn(direction);
    game.step();
  }
}

test("朝任何方向开局，第一步都不会踩到自己", () => {
  for (const direction of Object.keys(DIRECTIONS)) {
    const snake = new Snake({ direction });
    snake.step();
    const cells = new Set(snake.body.map(keyOf));
    assert.equal(cells.size, snake.body.length);
  }
});

test("走一步，蛇头移动一格", () => {
  const snake = new Snake({ start: [5, 5], direction: "right" });
  assert.deepEqual(snake.step(), [6, 5]);
});

test("不吃食物时长度不变", () => {
  const snake = new Snake({ length: 3 });
  snake.step();
  assert.equal(snake.length, 3);
});

test("grow 让蛇长一节", () => {
  const snake = new Snake({ length: 3 });
  snake.step(true);
  assert.equal(snake.length, 4);
});

test("掉头会被忽略", () => {
  const snake = new Snake({ direction: "right" });
  snake.turn("left");
  snake.step();
  assert.equal(snake.direction, "right");
});

test("turn 只在下一步生效", () => {
  const snake = new Snake({ direction: "right" });
  snake.turn("up");
  assert.equal(snake.direction, "right");
  snake.step();
  assert.equal(snake.direction, "up");
});

test("新开局处于 READY，score 为 0", () => {
  const game = new Game();
  assert.equal(game.state, GameState.READY);
  assert.equal(game.score, 0);
});

test("开始之前 step 不起作用", () => {
  const game = makeGame();
  const head = game.snake.head;
  game.step();
  assert.deepEqual(game.snake.head, head);
  assert.equal(game.state, GameState.READY);
});

test("start 之后蛇才会动", () => {
  const game = makeGame();
  game.start();
  const head = game.snake.head;
  game.step();
  assert.notDeepEqual(game.snake.head, head);
});

test("暂停时蛇不动", () => {
  const game = makeGame();
  game.start();
  game.togglePause();
  const head = game.snake.head;
  game.step();
  assert.deepEqual(game.snake.head, head);
  assert.equal(game.state, GameState.PAUSED);
});

test("吃到食物会加分并变长", () => {
  const game = makeGame();
  game.start();
  game.food = game.snake.nextHead();
  assert.equal(game.step(), true);
  assert.equal(game.score, SCORE_PER_FOOD);
  assert.equal(game.snake.length, 4);
});

test("食物永远不会生成在蛇身上（跑 200 个种子）", () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const game = new Game({ seed });
    assert.ok(
      !game.snake.body.map(keyOf).includes(keyOf(game.food)),
      `seed=${seed} 时食物落在了蛇身上`,
    );
  }
});

test("同一个种子得到同样的食物序列", () => {
  const a = new Game({ seed: 7 });
  const b = new Game({ seed: 7 });
  assert.deepEqual(a.food, b.food);
});

test("撞墙结束游戏", () => {
  const game = makeGame({ width: 10, height: 10, start: [9, 5], direction: "right" });
  game.start();
  game.step();
  assert.equal(game.state, GameState.GAME_OVER);
  assert.equal(game.death, Death.WALL);
});

test("撞到自己结束游戏", () => {
  const game = makeGame({ width: 10, height: 10, start: [5, 5], direction: "right", length: 5 });
  game.start();
  drive(game, ["right", "down", "left", "up"]);
  assert.equal(game.state, GameState.GAME_OVER);
  assert.equal(game.death, Death.SELF);
});

test("撞到即将让开的尾格不算死", () => {
  const game = makeGame({ width: 10, height: 10, start: [5, 5], direction: "right", length: 4 });
  game.start();
  drive(game, ["right", "down", "left", "up"]);
  assert.equal(game.state, GameState.RUNNING);
  assert.equal(game.death, null);
});

test("结束后再 step 不会有变化", () => {
  const game = makeGame({ width: 10, height: 10, start: [9, 5], direction: "right" });
  game.start();
  game.step();
  const head = game.snake.head;
  game.step();
  assert.deepEqual(game.snake.head, head);
  assert.equal(game.state, GameState.GAME_OVER);
});

test("reset 回到干净的开局", () => {
  const game = makeGame({ width: 10, height: 10, start: [9, 5], direction: "right" });
  game.start();
  game.step();
  assert.equal(game.state, GameState.GAME_OVER);

  game.reset();
  assert.equal(game.state, GameState.READY);
  assert.equal(game.score, 0);
  assert.equal(game.death, null);
  assert.equal(game.snake.length, 3);
  assert.deepEqual(game.snake.head, [9, 5]);
});
