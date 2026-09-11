/**
 * 排行榜 HTTP 接口的测试。
 *
 * 这些测试真的会起一个服务器、真的发 HTTP 请求。
 * 听起来重，但只有这样才测得到「路由挂对没有、状态码对不对、
 * 返回的 JSON 长什么样」—— 只测 store 是测不出这些的。
 */

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createApp } from "../server.js";

let server;
let baseUrl;

before(async () => {
  // 端口写 0：让操作系统随便分配一个空闲端口。
  // 写死 3000 的话，只要本机已经跑着一个开发服务器，测试就会失败。
  // 数据库用内存库，测试之间互不干扰，跑完自动消失。
  server = createApp({ dbPath: ":memory:" }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function postScore(body) {
  const res = await fetch(`${baseUrl}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

test("健康检查能通", async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

test("提交合法成绩返回 201", async () => {
  const { status, body } = await postScore({ name: "小明", score: 120 });
  assert.equal(status, 201);
  assert.equal(body.name, "小明");
  assert.equal(body.score, 120);
  assert.ok(body.id > 0);
});

test("提交非法成绩返回 400，并带上原因", async () => {
  const { status, body } = await postScore({ name: "", score: 120 });
  assert.equal(status, 400);
  assert.match(body.error, /名字/);
});

test("分数是字符串时返回 400", async () => {
  const { status } = await postScore({ name: "小明", score: "120" });
  assert.equal(status, 400);
});

test("排行榜接口返回按分数排序的结果", async () => {
  const app = createApp({ dbPath: ":memory:" });
  const own = app.listen(0);
  await new Promise((resolve) => own.once("listening", resolve));
  const url = `http://127.0.0.1:${own.address().port}`;

  try {
    for (const [name, score] of [
      ["甲", 30],
      ["乙", 300],
      ["丙", 150],
    ]) {
      await fetch(`${url}/api/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, score }),
      });
    }

    const res = await fetch(`${url}/api/scores/top`);
    const { scores } = await res.json();
    assert.deepEqual(
      scores.map((row) => row.name),
      ["乙", "丙", "甲"],
    );
  } finally {
    await new Promise((resolve) => own.close(resolve));
  }
});

test("limit 参数生效", async () => {
  const res = await fetch(`${baseUrl}/api/scores/top?limit=1`);
  const { scores } = await res.json();
  assert.equal(scores.length, 1);
});

test("limit 是垃圾值时退回默认值，而不是报错", async () => {
  for (const bad of ["999999", "abc", "-5", "0", "1.5"]) {
    const res = await fetch(`${baseUrl}/api/scores/top?limit=${bad}`);
    assert.equal(res.status, 200, `limit=${bad}`);
    const { scores } = await res.json();
    assert.ok(Array.isArray(scores), `limit=${bad}`);
  }
});

test("请求体不是合法 JSON 时返回 400 而不是崩掉", async () => {
  const res = await fetch(`${baseUrl}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ 这不是 JSON",
  });
  assert.equal(res.status, 400);
});

test("静态文件仍然正常提供", async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<title>贪吃蛇/);
});
