/**
 * 排行榜的数据层 —— 负责把分数存进 SQLite。
 *
 * 用 Node 24 自带的 node:sqlite，不需要装任何第三方数据库驱动。
 *
 * 这一层只做数据的事：建表、写入、查询。它不知道 HTTP、不知道 JSON、
 * 也不知道前端长什么样 —— 所以它能在测试里被独立调用。
 */

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/** 一局分数的上限。超过这个数，基本可以确定是伪造的或者出了 bug。 */
export const MAX_SCORE = 100_000;

/** 名字最多多少字符。 */
export const MAX_NAME_LENGTH = 20;

/**
 * 校验一条成绩提交。
 *
 * 返回 { ok: true, value } 或者 { ok: false, error }。
 *
 * 为什么校验要抽成单独一个函数？因为它必须被测试。
 * 而且测「非法输入被拒绝」比测「合法输入存得进去」更重要 ——
 * 前者才是安全问题的来源。
 */
export function validateSubmission(body) {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "请求体必须是一个 JSON 对象" };
  }

  if (typeof body.name !== "string") {
    return { ok: false, error: "name 必须是字符串" };
  }
  const name = body.name.trim();
  if (name.length === 0) {
    return { ok: false, error: "名字不能为空" };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `名字最多 ${MAX_NAME_LENGTH} 个字符` };
  }

  // Number.isInteger 会拒绝 "120" 这种字符串、1.5 这种小数、NaN 和 Infinity。
  // 用它而不是 parseFloat，是因为这里要的是「严格是整数」，
  // 而不是「尽量解释成数字」。
  if (!Number.isInteger(body.score)) {
    return { ok: false, error: "score 必须是整数" };
  }
  if (body.score < 0) {
    return { ok: false, error: "score 不能是负数" };
  }
  if (body.score > MAX_SCORE) {
    return { ok: false, error: `score 不能超过 ${MAX_SCORE}` };
  }

  return { ok: true, value: { name, score: body.score } };
}

/**
 * 打开（或新建）一个分数库。
 *
 * 传 ':memory:' 就得到一个只在内存里的库，进程结束就没了 ——
 * 测试用它，跑得飞快而且互不干扰。
 */
export function createScoreStore(filePath) {
  const inMemory = filePath === ":memory:";

  if (!inMemory) {
    // 目录不存在就先建出来，否则 SQLite 打不开文件。
    mkdirSync(path.dirname(filePath), { recursive: true });
  }

  const db = new DatabaseSync(filePath);

  // WAL 模式让「读」和「写」不互相阻塞。这是 SQLite 的常规调优。
  // 内存库不支持 WAL，所以跳过。
  if (!inMemory) db.exec("PRAGMA journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      score      INTEGER NOT NULL,
      created_at TEXT    NOT NULL
    )
  `);

  // 排行榜每次都是「按分数倒序取前几名」，给它建个索引。
  // 现在数据量小，感觉不出差别，但这是「知道自己要查什么」的习惯。
  db.exec("CREATE INDEX IF NOT EXISTS idx_scores_score ON scores (score DESC)");

  const insertStmt = db.prepare(
    "INSERT INTO scores (name, score, created_at) VALUES (?, ?, ?)",
  );

  // 分数相同时，先提交的排前面。加这个第二排序键，
  // 否则同分玩家的顺序是随机的，刷新一下名次就变，看起来很怪。
  const topStmt = db.prepare(`
    SELECT id, name, score, created_at
      FROM scores
     ORDER BY score DESC, created_at ASC, id ASC
     LIMIT ?
  `);

  return {
    add(name, score) {
      const row = {
        name,
        score,
        created_at: new Date().toISOString(),
      };
      const info = insertStmt.run(row.name, row.score, row.created_at);
      return { id: Number(info.lastInsertRowid), ...row };
    },

    top(limit = 10) {
      return topStmt.all(limit);
    },

    count() {
      return Number(db.prepare("SELECT COUNT(*) AS n FROM scores").get().n);
    },

    close() {
      db.close();
    },
  };
}
