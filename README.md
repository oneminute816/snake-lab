# 🐍 snake-lab（贪吃蛇实验室）

![测试与部署](https://github.com/oneminute816/snake-lab/actions/workflows/ci-cd.yml/badge.svg)

一个用于学习的实战小项目。目标不是做出一款多厉害的游戏，而是**把 Codex · Git · GitHub · Python · Node.js 五样工具的完整工作流走通一遍**。

> 🚧 当前状态：开发中 · **M3 代码完成，等 PR 合并**

🔗 **在线试玩**：<https://oneminute816.github.io/snake-lab/>

---

## 它会变成什么

- 🐍 **终端版**：Python 写的命令行贪吃蛇，带单元测试
- 🌐 **网页版**：浏览器里用方向键玩的 Canvas 版本
- 🏆 **排行榜**：成绩存进数据库，关掉服务器再打开还在
- 🤖 **Python 工具链**：分数统计分析 + 一个会自己玩游戏的 AI

> ⚠️ 顶部那个在线试玩是**纯静态部署**，没有后端，所以排行榜不可用 ——
> 游戏照常能玩，只是不记分。想要完整功能，按下面的说明在本地跑。

## 为什么选贪吃蛇

1. 逻辑简单但完整——移动、碰撞、计分、结束判定，麻雀虽小五脏俱全
2. Python 和 Node.js 都有真实活干，不是硬凑两种语言
3. 加上排行榜就必须有前后端通信和数据库，这是真实项目的形状
4. 游戏逻辑天然适合写单元测试

## 项目结构

```
snake-lab/
├── README.md              # 你正在读的这个文件
├── .gitignore             # 告诉 Git 哪些文件不要提交
├── IDEAS.md               # 想法收集箱（现在别做，做完再看）
├── docs/
│   ├── PLAN.md            # 完整项目计划书：里程碑、验收标准、Codex 使用手册
│   └── design.md          # 游戏设计：规则、状态机、数据结构
├── python-prototype/      # 阶段一：Python 命令行版
├── web/                   # 阶段二：Node.js + Canvas 网页版
└── tools/                 # 阶段三：Python 数据分析与 AI 自动玩
```

## 学习进度

- [x] **M0** 环境与工具链：Git 配置、仓库初始化、推到 GitHub
- [x] **M1** Python 命令行版贪吃蛇 + pytest 单元测试
- [x] **M2** Node.js + Express + Canvas 网页版
- [~] **M3** GitHub Issue / PR 流程 + 排行榜后端与数据库 ← 代码完成，等 PR 合并
- [ ] **M4** Python 工具链 + AI 自动玩 + 文档与发布

## 技术栈

| 层 | 技术 | 学习阶段 |
| --- | --- | --- |
| 游戏原型 | Python 3.14 · pytest | M1 |
| 前端 | HTML5 Canvas · 原生 JavaScript | M2 |
| 后端 | Node.js 24 · Express | M2 / M3 |
| 数据 | SQLite | M3 |
| 工具链 | Python（统计分析、AI 自动玩） | M4 |
| 版本控制 | Git · GitHub | 全程 |

## 本地运行

### 终端版（Python）

```powershell
# 首次：建虚拟环境并装依赖
cd snake-lab
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r python-prototype\requirements.txt

# 玩
cd python-prototype
..\.venv\Scripts\python.exe main.py
```

方向键或 WASD 移动，空格开始，P 暂停，R 重开，Q 退出。

### 网页版（Node.js）

```powershell
cd snake-lab/web
npm install     # 只需第一次
npm start
```

然后浏览器打开 <http://localhost:3000>。方向键或 WASD 移动，空格开始，P 暂停，R 重开。

详细说明见 [python-prototype/README.md](python-prototype/README.md) 和 [web/README.md](web/README.md)。

### 跑测试

```powershell
# Python 版：24 条
cd python-prototype
..\.venv\Scripts\python.exe -m pytest -v

# 网页版：18 条
cd web
npm test
```

## 许可

MIT
