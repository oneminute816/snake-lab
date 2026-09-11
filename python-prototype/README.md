# python-prototype · Python 命令行版

**阶段 M1 已完成。现在可以在终端里玩了。**

## 怎么跑

首次运行前先建虚拟环境、装依赖（只需做一次）：

```powershell
cd snake-lab
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r python-prototype\requirements.txt
```

之后每次玩游戏：

```powershell
cd python-prototype
..\.venv\Scripts\python.exe main.py
```

## 操作

| 按键 | 作用 |
| --- | --- |
| 空格 | 开始 |
| 方向键 或 WASD | 移动 |
| P | 暂停 / 继续 |
| R | 重开一局 |
| Q 或 Esc | 退出 |

吃到食物加 10 分、蛇身加一节。撞墙或咬到自己就结束。

## 跑测试

```powershell
..\.venv\Scripts\python.exe -m pytest -v
```

## 文件都是干什么的

```
python-prototype/
├── game.py            # 游戏规则：蛇怎么走、食物在哪、什么时候算死
├── main.py            # 终端界面：读键盘、把画面画出来
├── requirements.txt   # 依赖清单（只有 pytest）
├── pytest.ini         # 告诉 pytest 去哪儿找测试
└── tests/
    ├── test_game.py   # 游戏规则的测试
    └── test_main.py   # 画面渲染的测试
```

## 为什么 game.py 和 main.py 要拆开

这是这个阶段最重要的一课。把「规则」和「显示」分开，好处有三层：

1. **规则可以脱离终端单独测试。** `main.py` 里的东西要开个终端窗口才能验证，
   而 `game.py` 里的逻辑跑一次只要几毫秒。所以规则写得越纯，测起来越省事。
2. **将来做网页版时可以直接翻译。** M2 要把这套逻辑搬进浏览器，
   到时候 `game.py` 就是最好的参考答案。
3. **出 bug 时能一眼定位。** 「蛇撞墙没死」是规则问题，找 `game.py`；
   「蛇画到边框外面去了」是显示问题，找 `main.py`。

同样的思路在 `main.py` 里也用了：`render()` 只负责「画什么」，返回一段文本，
不碰终端。所以它能像普通函数一样被测试，不需要真的开个窗口盯着看。
