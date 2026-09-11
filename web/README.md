# web · Node.js + Express + Canvas 网页版

**阶段 M2 已完成。** 浏览器里能玩了。

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

## 跑测试

```powershell
npm test
```

用的是 **Node 自带的测试运行器**（`node --test`），不需要装 Jest、Mocha 之类的框架。
JavaScript 世界不一定非得装一堆东西才能写测试。

## 文件都是干什么的

```
web/
├── public/            # 前端：浏览器直接加载的静态文件
│   ├── index.html     # 页面结构
│   ├── style.css      # 样式
│   ├── game.js        # 游戏规则（纯逻辑，不碰浏览器）
│   └── main.js        # Canvas 绘制 + 键盘输入 + 游戏循环
├── server.js          # Express 服务器，把 public/ 发给浏览器
├── test/
│   └── game.test.js   # 规则层测试
└── package.json       # 依赖清单 + npm 脚本
```

## 计划中的接口

M3 会加进 `server.js`：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `POST` | `/api/scores` | 提交一条成绩 |
| `GET` | `/api/scores/top` | 获取排行榜前 10 名 |

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
npm test                     # 18 条规则测试
npm start                    # 另开一个终端
curl http://localhost:3000   # 应该返回 index.html
```
