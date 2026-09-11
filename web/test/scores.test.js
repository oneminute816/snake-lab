/**
 * 数据层与输入校验的测试。
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  MAX_NAME_LENGTH,
  MAX_SCORE,
  createScoreStore,
  validateSubmission,
} from "../src/scores.js";

// ───────────────────────── 输入校验 ─────────────────────────

test("合法提交能通过校验", () => {
  const result = validateSubmission({ name: "小明", score: 120 });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { name: "小明", score: 120 });
});

test("名字两边的空格会被去掉", () => {
  const result = validateSubmission({ name: "  小明  ", score: 10 });
  assert.equal(result.ok, true);
  assert.equal(result.value.name, "小明");
});

test("拒绝空名字", () => {
  assert.equal(validateSubmission({ name: "", score: 10 }).ok, false);
  assert.equal(validateSubmission({ name: "     ", score: 10 }).ok, false);
});

test("拒绝过长的名字", () => {
  const longName = "啊".repeat(MAX_NAME_LENGTH + 1);
  assert.equal(validateSubmission({ name: longName, score: 10 }).ok, false);
});

test("拒绝非字符串的 name", () => {
  for (const name of [123, null, undefined, [], {}]) {
    assert.equal(validateSubmission({ name, score: 10 }).ok, false, `name=${name}`);
  }
});

test("拒绝非整数分数", () => {
  for (const score of ["120", 1.5, NaN, Infinity, null, undefined]) {
    assert.equal(validateSubmission({ name: "小明", score }).ok, false, `score=${score}`);
  }
});

test("拒绝负分", () => {
  assert.equal(validateSubmission({ name: "小明", score: -1 }).ok, false);
});

test("拒绝超出上限的分数", () => {
  assert.equal(validateSubmission({ name: "小明", score: MAX_SCORE + 1 }).ok, false);
});

test("请求体不是对象时也被拒绝", () => {
  for (const body of [null, undefined, "字符串", 42, []]) {
    assert.equal(validateSubmission(body).ok, false);
  }
});

// ───────────────────────── 存储 ─────────────────────────

test("能写入并读回一条分数", () => {
  const store = createScoreStore(":memory:");
  const saved = store.add("小明", 120);

  assert.ok(saved.id > 0);
  assert.equal(saved.name, "小明");
  assert.equal(saved.score, 120);
  assert.equal(typeof saved.created_at, "string");
  assert.equal(store.count(), 1);

  store.close();
});

test("排行榜按分数从高到低排", () => {
  const store = createScoreStore(":memory:");
  store.add("低分", 10);
  store.add("高分", 300);
  store.add("中分", 150);

  const top = store.top(10);
  assert.deepEqual(
    top.map((row) => row.name),
    ["高分", "中分", "低分"],
  );

  store.close();
});

test("limit 限制返回条数", () => {
  const store = createScoreStore(":memory:");
  for (let i = 1; i <= 15; i += 1) store.add(`玩家${i}`, i * 10);

  assert.equal(store.top(5).length, 5);
  assert.equal(store.top(100).length, 15);

  store.close();
});

test("重开一个服务，分数还在（这是排行榜最核心的承诺）", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "snake-scores-"));
  const dbPath = path.join(dir, "scores.db");

  try {
    // 第一次：写入两条，然后关掉
    const first = createScoreStore(dbPath);
    first.add("上一局的玩家", 250);
    first.add("另一个玩家", 90);
    first.close();

    // 第二次：重新打开同一个文件
    const second = createScoreStore(dbPath);
    assert.equal(second.count(), 2);

    const top = second.top(10);
    assert.equal(top[0].name, "上一局的玩家");
    assert.equal(top[0].score, 250);
    second.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
