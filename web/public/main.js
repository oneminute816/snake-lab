/**
 * 浏览器端：把 game.js 的规则画到 Canvas 上，并把键盘输入喂给它。
 *
 * 分工和 Python 版一模一样 —— game.js 管规则，这里管显示。
 * 这个文件里的东西全部没法单元测试（要开浏览器才知道对不对），
 * 所以它越薄越好：所有值得测的逻辑都已经在 game.js 里了。
 */

import { api } from "./api.js";
import { Death, Game, GameState } from "./game.js";

const CELL = 24; // 每格多少像素。画布 480x480 = 20x20 格
const FRAME_MS = 120; // 多少毫秒走一步。数字越小蛇越快

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const lengthEl = document.getElementById("length");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlay-text");
const submitForm = document.getElementById("submit-form");
const nameInput = document.getElementById("player-name");
const submitMessage = document.getElementById("submit-message");
const leaderboardList = document.getElementById("leaderboard-list");
const leaderboardNote = document.getElementById("leaderboard-note");

const game = new Game({ width: 20, height: 20 });

// 后端在不在？在 GitHub Pages 那种纯静态环境下，它不在。
// 这时游戏照常能玩，只是没有排行榜 —— 这叫优雅降级。
let backendReady = false;

// 本局成绩是否已经提交过。没有这个标记的话，提交完这一帧刚把表单藏起来，
// 下一帧重绘又把它显示出来了。
let submittedScore = false;

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
  const snapshot =
    `${game.score}|${game.snake.length}|${game.state}|${game.death}` +
    `|${backendReady}|${submittedScore}`;
  if (snapshot === lastHud) return;
  lastHud = snapshot;

  scoreEl.textContent = game.score;
  lengthEl.textContent = game.snake.length;
  submitForm.hidden = true;

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

    // 得 0 分不让提交 —— 否则排行榜很快会被一堆 0 分刷满。
    submitForm.hidden = !(backendReady && game.score > 0 && !submittedScore);
  }
}

document.addEventListener("keydown", (event) => {
  // 正在输入名字时，键盘归输入框，别拿去控制蛇。
  // 少了这一行，名字里带 r 就会被当成「重开」。
  if (event.target?.tagName === "INPUT") return;

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
    submittedScore = false;
    submitMessage.textContent = "";
    nameInput.value = "";
  }
});

// ───────────────────────── 排行榜 ─────────────────────────

/**
 * 清空列表并填入新的名次。
 *
 * 注意这里是 createElement + textContent，而不是拼 innerHTML。
 * 排行榜上的名字来自**别人提交的数据** —— 拼 HTML 的话，
 * 有人把名字填成带脚本的标签，就能在所有访客的页面上执行代码。
 * 这类问题叫 XSS，是前端最常见的安全漏洞。用 textContent 就不会有。
 */
function renderLeaderboard(scores) {
  leaderboardList.replaceChildren();

  if (scores.length === 0) {
    leaderboardNote.textContent = "还没有人上榜，来做第一个";
    return;
  }

  leaderboardNote.textContent = "";
  for (const row of scores) {
    const item = document.createElement("li");

    const name = document.createElement("span");
    name.className = "rank-name";
    name.textContent = row.name;

    const score = document.createElement("span");
    score.className = "rank-score";
    score.textContent = row.score;

    item.append(name, score);
    leaderboardList.append(item);
  }
}

async function refreshLeaderboard() {
  if (!backendReady) return;
  try {
    renderLeaderboard(await api.top(10));
  } catch (error) {
    leaderboardNote.textContent = `排行榜加载失败：${error.message}`;
  }
}

/**
 * 看看后端在不在。
 *
 * 静态部署时这个请求会拿到 404，于是把排行榜标成「不可用」，
 * 但游戏本体完全不受影响。这是把「能玩」和「有排行榜」分成两件事的好处。
 */
async function checkBackend() {
  try {
    await api.top(1);
    backendReady = true;
  } catch {
    backendReady = false;
    leaderboardNote.textContent = "这是静态部署，没有后端，排行榜不可用。";
  }
}

submitForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  if (name.length === 0) {
    submitMessage.textContent = "先填个名字吧";
    return;
  }

  submitMessage.textContent = "提交中…";
  try {
    await api.submit(name, game.score);
    submittedScore = true;
    submitForm.hidden = true;
    submitMessage.textContent = "成绩已提交 ✓";

    // 主动把焦点交还给页面。不这么做的话焦点还留在输入框里，
    // 之后按 R 重开会没反应 —— 键盘事件全被输入框接走了。
    nameInput.blur();

    await refreshLeaderboard();
  } catch (error) {
    submitMessage.textContent = `提交失败：${error.message}`;
  }
});

await checkBackend();
await refreshLeaderboard();

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
