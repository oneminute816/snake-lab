# tools · Python 工具链

**阶段 M4 已完成。** 两个脚本：一个让程序自己玩游戏，一个把分数算成报告。

## 怎么跑

两个脚本都从 `snake-lab/` 目录下运行。

### AI 自动玩

```powershell
.\.venv\Scripts\python.exe tools\auto_player.py              # 玩一局
.\.venv\Scripts\python.exe tools\auto_player.py --games 20   # 玩 20 局看统计
.\.venv\Scripts\python.exe tools\auto_player.py --board      # 把棋盘画出来
.\.venv\Scripts\python.exe tools\auto_player.py --submit     # 提交到本地排行榜
```

实测它能稳定拿到 500–1200 分，蛇身长到 100 节以上（棋盘一共 400 格）。

`--submit` 需要先把服务器跑起来（`cd web; npm start`），否则会提示提交失败。

### 分数统计

```powershell
.\.venv\Scripts\python.exe tools\stats.py
.\.venv\Scripts\python.exe tools\stats.py --top 5
```

输出长这样：

```
🐍 贪吃蛇分数报告
==================================
总局数    3
最高分    1160
平均分    1000.0
中位数    1040.0

🏆 排行榜
   1. AI 贪吃蛇             1160
   2. AI 贪吃蛇             1040
   3. Codex                800

👤 各玩家
  AI 贪吃蛇             2 局   最高 1160
  Codex              1 局   最高 800

📅 按日期
  2026-09-11     3 局   最高 1160
```

## 跑测试

```powershell
cd tools
..\.venv\Scripts\python.exe -m pytest -v
```

## AI 是怎么想的

`choose_direction()` 每一步做两层判断：

**第一层：筛掉会立刻死掉的走法。** 撞墙、撞自己，以及掉头（等于撞自己的脖子）。这一步保证它不犯低级错误。

**第二层：在活下来的走法里挑最好的。** 排序键是三个条件的组合：

```
(会不会被困死, 离食物多远, 剩多少活动空间)
```

其中「会不会被困死」是用**洪水填充**算出来的：假设走这一步，从新蛇头出发还能摸到多少空格子。如果摸到的地方比蛇身还短，说明很可能把自己圈死。

**只做第一层会怎样？** 蛇会一头扎进死角——它只看得见食物，看不见「吃完之后还出不出得来」。第二层就是补这个的。这是写游戏 AI 最经典的一课：**局部最优不等于全局可行**。

## 一个跨语言的细节

`stats.py` 读的那个 `.db` 文件，是 Node.js 那边用 `node:sqlite` 写进去的。

**两个语言、两个驱动、同一个文件。** 这不是巧合——SQLite 的文件格式是公开标准，不是哪家公司私有的东西。所以数据可以一个语言写、另一个语言读，中间不需要任何转换。

这也是为什么「把数据存进公开格式的文件」和「存进某个语言的私有格式」是两件很不一样的事。
