# 🐍 snake-lab（贪吃蛇实验室）

![测试与部署](https://github.com/oneminute816/snake-lab/actions/workflows/ci-cd.yml/badge.svg)

一个用于学习的实战小项目。目标不是做出一款多厉害的游戏，而是**把 Codex · Git · GitHub · Python · Node.js 五样工具的完整工作流走通一遍**。

> 🚧 当前状态：**M4 代码完成，等 PR 合并**

🔗 **在线试玩**：<https://oneminute816.github.io/snake-lab/>

---

## 它会变成什么

- 🐍 **终端版**：Python 写的命令行贪吃蛇，带单元测试
- 🌐 **网页版**：浏览器里用方向键玩的 Canvas 版本
- 🏆 **排行榜**：成绩存进数据库，关掉服务器再打开还在
- 🤖 **会玩游戏的 AI**：一个 Python 脚本，自己刷自己的排行榜
- 📊 **分数统计**：把成绩算成报告，看看谁在哪天打得最好

> ⚠️ 顶部那个在线试玩是**纯静态部署**，没有后端，所以排行榜不可用 ——
> 游戏照常能玩，只是不记分。想要完整功能，看下面的「部署」一节。

## 为什么选贪吃蛇

1. 逻辑简单但完整——移动、碰撞、计分、结束判定，麻雀虽小五脏俱全
2. Python 和 Node.js 都有真实活干，不是硬凑两种语言
3. 加上排行榜就必须有前后端通信和数据库，这是真实项目的形状
4. 游戏逻辑天然适合写单元测试

## 项目结构

```
snake-lab/
├── README.md              # 你正在读的这个文件
├── RETROSPECTIVE.md       # 项目复盘（留给你自己写）
├── IDEAS.md               # 想法收集箱
├── render.yaml            # 部署到 Render 的配置
├── .github/workflows/     # CI/CD：跑测试 → 通过才发布
├── docs/
│   ├── PLAN.md            # 项目计划书：里程碑、验收标准、Codex 使用手册
│   └── design.md          # 游戏设计：规则、状态机、数据结构
├── python-prototype/      # M1：Python 命令行版（24 条测试）
├── web/                   # M2/M3：网页版 + 排行榜 API（40 条测试）
└── tools/                 # M4：AI 自动玩 + 分数统计（18 条测试）
```

## 学习进度

- [x] **M0** 环境与工具链：Git 配置、仓库初始化、推到 GitHub
- [x] **M1** Python 命令行版贪吃蛇 + pytest 单元测试
- [x] **M2** Node.js + Express + Canvas 网页版
- [~] **M3** GitHub Issue / PR 流程 + 排行榜后端与数据库 ← 代码完成，等 PR 合并
- [~] **M4** Python 工具链 + AI 自动玩 + 文档与发布 ← 代码完成，等 PR 合并

## 技术栈

| 层 | 技术 | 学习阶段 |
| --- | --- | --- |
| 游戏原型 | Python 3.14 · pytest | M1 |
| 前端 | HTML5 Canvas · 原生 JavaScript | M2 |
| 后端 | Node.js 24 · Express | M2 / M3 |
| 数据 | SQLite（`node:sqlite`，Node 24 自带） | M3 |
| 工具链 | Python（统计分析、AI 自动玩） | M4 |
| 流水线 | GitHub Actions | M3 / M4 |
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

玩完一局如果分数大于 0，可以填名字提交到右侧的排行榜。

### 让 AI 自己玩

```powershell
cd snake-lab
.\.venv\Scripts\python.exe tools\auto_player.py --games 10   # 玩 10 局看统计
.\.venv\Scripts\python.exe tools\auto_player.py --submit     # 把最高分刷上排行榜
.\.venv\Scripts\python.exe tools\stats.py                    # 看看分数报告
```

实测它能稳定拿到 500–1200 分，蛇身长到 100 节以上（棋盘一共 400 格）。

拿它跟你的手打成绩比一比——挺打击人的。

### 跑测试

一共 **82 条**：

```powershell
cd snake-lab

# Python 游戏逻辑：24 条
cd python-prototype; ..\.venv\Scripts\python.exe -m pytest -v; cd ..

# 网页版：40 条
cd web; npm test; cd ..

# 工具链：18 条
cd tools; ..\.venv\Scripts\python.exe -m pytest -v; cd ..
```

这些测试不用你记得跑——每次 push 和开 PR，GitHub Actions 都会自动跑一遍。

## 部署

这个项目有两种部署形态，因为**前端是纯静态的，但排行榜需要后端**：

| 方式 | 部署什么 | 排行榜 | 免费吗 |
| --- | --- | --- | --- |
| GitHub Pages | 只有 `web/public/` | ❌ 不可用 | 免费 |
| Render / Railway | 整个 `web/`（Node 进程） | ✅ 可用 | 有免费额度 |

### GitHub Pages（已配置好）

`.github/workflows/ci-cd.yml` 会在测试通过后自动发布。地址：

<https://oneminute816.github.io/snake-lab/>

### 带后端的完整版

仓库里已经放了 `render.yaml`。步骤：

1. 注册 <https://render.com>，用 GitHub 账号登录
2. New → Blueprint → 选 `snake-lab` 仓库
3. 点确认，等几分钟

⚠️ **免费套餐的磁盘是临时的**：每次重新部署，SQLite 里的分数都会清零。想长期保存数据，要么买一块持久磁盘，要么把数据挪到外部数据库服务。

这不是配置写错了，是免费套餐的固有限制——**也正好说明了「文件里的数据库」和「真正的数据库服务」差在哪**。

## 许可

MIT
