# web · Node.js 网页版

**阶段 M2 / M3** 的成果会放在这里。

## 计划内容

```
web/
├── public/            # 前端：浏览器直接加载的静态文件
│   ├── index.html
│   ├── style.css
│   └── game.js        # 游戏循环 + Canvas 绘制
├── server.js          # 后端：Express 服务器 + REST API
└── package.json       # 项目描述 + 依赖清单（npm 生成）
```

## 计划中的接口

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/` | 返回游戏页面 |
| `POST` | `/api/scores` | 提交一条成绩 |
| `GET` | `/api/scores/top` | 获取排行榜前 10 名 |

## 提醒

`npm install` 会生成 `node_modules/` 文件夹，它**绝对不能提交到 Git**。`.gitignore` 里已经帮你排除了。

还没有代码，M2 开始写。
