# web · Node.js + Express + Canvas 网页版

**阶段 M2、M3 已完成。** 浏览器里能玩，成绩能存进数据库。

## 怎么跑

```powershell
cd snake-lab/web
npm install     # 只需第一次，会生成 node_modules/
npm start
```

然后浏览器打开 <http://localhost:3000>。

## 操作

| 按键 | 作用 |
| --- | --- |
| 空格 | 开始 |
| 方向键 或 WASD | 移动 |
| P | 暂停 / 继续 |
| R | 重开一局 |

玩完一局后，如果分数大于 0，会弹出输入框让你填名字提交成绩。

## 跑测试

```powershell
npm test
```

用的是 **Node 自带的测试运行器**（`node --test`），不需要装 Jest、Mocha 之类的框架。
JavaScript 世界不一定非得装一堆东西才能写测试。

测试里也会真的起一个服务器、真的发 HTTP 请求 —— 光测数据层是测不出
「路由挂对没有、状态码对不对」的。

## 文件都是干什么的

```
 web/
├── public/            # 前端：浏览器直接加载的静态文件
│   ├── index.html     # 页面结构
│   ├── style.css      # 样式
│   ├── game.js        # 游戏规则（纯逻辑，不碰浏览器）
│   ├── main.js        # Canvas 绘制 + 键盘输入 + 游戏循环
│   └── api.js         # 跟后端通信
├── src/
│   └── scores.js      # 数据层：建表、写入、查询、输入校验
├── server.js          # Express 服务器 + 排行榜 API
├── test/
│   ├── game.test.js   # 规则层测试
│   ├── scores.test.js # 数据层与校验测试
│   └── api.test.js    # HTTP 接口测试
├── data/              # SQLite 数据库文件（已被 .gitignore 排除）
└── package.json       # 依赖清单 + npm 脚本
```

## 排行榜接口

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `POST` | `/api/scores` | 提交一条成绩，body 形如 `{"name": "...", "score": 120}` |
| `GET` | `/api/scores/top?limit=10` | 取排行榜前 N 名 |
| `GET` | `/api/health` | 健康检查，返回 `{"ok": true}` |

拿命令行试一下（注意是 `curl.exe`，PowerShell 里的 `curl` 是另一个命令的别名）：

```powershell
curl.exe -X POST http://localhost:3000/api/scores -H "Content-Type: application/json" -d "{\"name\":\"测试\",\"score\":120}"
curl.exe http://localhost:3000/api/scores/top
```

## 数据库

用的是 **Node 24 自带的 `node:sqlite`**，不需要装任何第三方数据库驱动。

数据存在 `web/data/scores.db`，重启服务器后分数还在。这个目录被 `.gitignore`
排除了 —— **数据库文件不该进版本库**，它是运行时的数据，不是代码。

想清空排行榜，直接删掉那个文件就行。

## 静态部署的限制

同一份前端代码有两种部署形态：

| 部署方式 | 有后端吗 | 排行榜 |
| --- | --- | --- |
| `npm start` 本地跑 | 有 | 可用 |
| GitHub Pages | 没有 | 不可用 |

`main.js` 启动时会先探一下 `/api/health`，探不到就把排行榜标成不可用，
**游戏本体完全不受影响**。这种「少了个零件也照样能用」的设计叫优雅降级。

想让排行榜在公网上也能用，得把整个 `web/` 部署到能跑 Node 进程的平台
（Render、Railway 之类），而不是静态托管。这是 M4 的事。

## 和 Python 版的对照

M2 最有价值的部分其实是这张表 —— 同一套规则写两遍，才能看清「什么是语言的特性，什么是问题本身」。

| 事情 | Python | JavaScript |
| --- | --- | --- |
| 蛇身容器 | `deque` + `appendleft` / `pop` | 数组 + `unshift` / `pop` |
| 坐标 | 元组 `(5, 5)` | 数组 `[5, 5]` |
| 判断某格被占 | 元组能直接放进 `set` | 数组不能，得转成 `"5,5"` 字符串再放进 `Set` |
| 可复现的随机 | `random.Random(seed)` 天生支持 | `Math.random()` 不支持，得自己写一个 mulberry32 |
| 引用自身 | `self` 写在第一个参数位置 | `this`，由调用方式决定 |
| 划分代码块 | 缩进 | 花括号 |
| 抛异常 | `raise ValueError(...)` | `throw new Error(...)` |
| 只读属性 | `@property` | `get 属性名()` |
| 模块导入 | `from game import Snake` | `import { Snake } from "./game.js"` |

## 两个容易踩的坑

**① `node --test test/` 在 Windows 上会失败。** 目录参数带斜杠时 Node 会当成模块名去找。用 `node --test` 让它自动发现测试文件就好。

**② `node_modules/` 绝对不能提交。** 它体积大、平台相关，而且能从 `package.json` 重新装出来。`.gitignore` 里已经排除了。

## 怎么验证能跑

```powershell
npm test                          # 40 条测试
npm start                         # 另开一个终端
curl.exe http://localhost:3000    # 应该返回 index.html
```
