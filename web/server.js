/**
 * Express 服务器 —— 静态文件服务 + 排行榜 API。
 *
 * createApp() 只负责「拼装出一个 app 并返回」，不负责监听端口。
 * 这个区分很重要：测试可以 import 它、让系统随便分配一个空闲端口，
 * 而正式运行才去占用 3000。混在一起的话，测试就会和真实服务抢端口。
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import express from "express";

import { createScoreStore, validateSubmission } from "./src/scores.js";

// ESM 里没有 CommonJS 的 __dirname 这个东西，得自己从当前文件路径算出来。
// 这是从 CommonJS 搬到 ESM 时最常卡住的一步。
const here = path.dirname(fileURLToPath(import.meta.url));

/** 一次最多返回多少条，防止有人用 ?limit=999999 把服务器拖垮。 */
const MAX_TOP_LIMIT = 50;

export function createApp({ dbPath } = {}) {
  const resolvedDbPath =
    dbPath ?? process.env.DB_PATH ?? path.join(here, "data", "scores.db");

  const store = createScoreStore(resolvedDbPath);
  const app = express();

  // 解析 JSON 请求体。限 4kb，防止有人往里塞垃圾。
  app.use(express.json({ limit: "4kb" }));

  app.use(express.static(path.join(here, "public")));

  app.post("/api/scores", (req, res) => {
    const result = validateSubmission(req.body);
    if (!result.ok) {
      // 400 = 客户端送来的数据有问题。和 500（服务器自己出错）区分开，
      // 前端才能判断「是不是我提交的内容不对」。
      return res.status(400).json({ error: result.error });
    }

    const saved = store.add(result.value.name, result.value.score);
    // 201 = 创建成功。比 200 更精确。
    return res.status(201).json(saved);
  });

  app.get("/api/scores/top", (req, res) => {
    const requested = Number(req.query.limit ?? 10);
    const limit =
      Number.isInteger(requested) && requested > 0
        ? Math.min(requested, MAX_TOP_LIMIT)
        : 10;

    return res.json({ scores: store.top(limit) });
  });

  // 健康检查。部署到云平台时，它们会定期访问这个地址判断服务是否活着。
  app.get("/api/health", (req, res) => res.json({ ok: true }));

  app.locals.store = store;
  return app;
}

// 只有「直接运行 server.js」时才启动监听。
// 被测试 import 的时候不启动 —— 否则每次跑测试都会占住 3000 端口。
//
// 这就是 ESM 版的 if __name__ == "__main__"，Python 里那套在这里同样适用。
const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => {
    console.log(`贪吃蛇服务已启动：http://localhost:${port}`);
  });
}
