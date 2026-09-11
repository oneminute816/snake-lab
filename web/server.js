/**
 * Express 服务器 —— 把 public/ 里的文件发给浏览器。
 *
 * 目前它只做静态文件服务，还没有任何接口。
 * M3 会在这里加上排行榜的 REST API 和数据库。
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

// ESM 里没有 CommonJS 的 __dirname 这个东西，得自己从当前文件路径算出来。
// 这是从 CommonJS 搬到 ESM 时最常卡住的一步。
const here = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.static(path.join(here, "public")));

app.listen(port, () => {
  console.log(`贪吃蛇服务已启动：http://localhost:${port}`);
});
