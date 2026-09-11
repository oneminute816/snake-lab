/**
 * 浏览器端：把 game.js 的规则画到 Canvas 上，并把键盘输入喂给它。
 *
 * 分工和 Python 版一模一样 —— game.js 管规则，这里管显示。
 * 这个文件里的东西全部没法单元测试（要开浏览器才知道对不对），
 * 所以它越薄越好：所有值得测的逻辑都已经在 game.js 里了。
 */

import { Death, Game, GameState } from "./game.js";

const CELL = 24; // 每格多少像素。画布 480x480 = 20x20 格
const FRAME_MS = 120; // 多少毫秒走一步。数字越小蛇越快

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const lengthEl = document.getElementById("length");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlay-text");

const game = new Game({ width: 20, height: 20 });

const KEY_TO_DIRECTION = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

function fillRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height); // 老浏览器退回直角，不影响玩
  ctx.fill();
}

function draw() {
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 网格线：让玩家一眼能看出格子边界
  ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 1; i < game.width; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * CELL + 0.5, 0);
    ctx.lineTo(i * CELL + 0.5, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * CELL + 0.5);
    ctx.lineTo(canvas.width, i * CELL + 0.5);
    ctx.stroke();
  }

  if (game.food) {
    const [fx, fy] = game.food;
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.arc(fx * CELL + CELL / 2, fy * CELL + CELL / 2, CELL * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 从尾巴往头画，这样蛇头永远压在蛇身上面
  const body = game.snake.body;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    const [x, y] = body[i];
    ctx.fillStyle = i === 0 ? "#4ade80" : "#22c55e";
    fillRoundedRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4, 6);
  }
}

let lastHud = "";

function refreshHud() {
  // 组合成一个字符串做比较：内容没变就不碰 DOM。
  // 下面这个循环每秒要跑 60 次，每次无条件改 textContent 是白费力气。
  const snapshot = `${game.score}|${game.snake.length}|${game.state}|${game.death}`;
  if (snapshot === lastHud) return;
  lastHud = snapshot;

  scoreEl.textContent = game.score;
  lengthEl.textContent = game.snake.length;

  if (game.state === GameState.RUNNING) {
    overlay.classList.add("hidden");
    return;
  }

  overlay.classList.remove("hidden");
  if (game.state === GameState.READY) {
    overlayText.textContent = "按空格开始";
  } else if (game.state === GameState.PAUSED) {
    overlayText.textContent = "已暂停 · 按 P 继续";
  } else {
    const reason = game.death === Death.WALL ? "撞到墙了" : "咬到自己了";
    overlayText.textContent = `游戏结束 · ${reason} · 按 R 重开`;
  }
}

document.addEventListener("keydown", (event) => {
  // 单个字符的键（w/a/s/d）统一转小写，这样大小写都能用
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  // 用 Object.hasOwn 而不是 `key in KEY_TO_DIRECTION`：
  // in 会连原型链上的属性一起查，像 "constructor" 这种键会误判成存在。
  if (Object.hasOwn(KEY_TO_DIRECTION, key)) {
    event.preventDefault(); // 别让方向键把页面滚走
    game.snake.turn(KEY_TO_DIRECTION[key]);
    if (game.state === GameState.READY) game.start();
    return;
  }

  if (key === " ") {
    event.preventDefault();
    if (game.state === GameState.READY) game.start();
  } else if (key === "p") {
    game.togglePause();
  } else if (key === "r") {
    game.reset();
  }
});

let previous = performance.now();
let accumulator = 0;

function loop(now) {
  const elapsed = now - previous;
  previous = now;
  accumulator += elapsed;

  // 用「时间累加器」而不是「每帧走一步」：
  // 这样即使浏览器掉帧，游戏速度也保持不变。
  // 直接每帧走一步的话，高刷屏上蛇会跑得飞快。
  while (accumulator >= FRAME_MS) {
    accumulator -= FRAME_MS;
    if (game.state === GameState.RUNNING) game.step();
  }

  draw();
  refreshHud();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
