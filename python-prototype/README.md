# python-prototype · Python 命令行版

**阶段 M1** 的成果会放在这里。

## 计划内容

```
python-prototype/
├── main.py            # 程序入口：终端渲染 + 键盘输入
├── game.py            # 纯游戏逻辑（无界面依赖，方便测试）
├── requirements.txt   # 依赖清单
└── tests/
    └── test_game.py   # pytest 单元测试
```

## 为什么 game.py 和 main.py 要拆开

把「游戏规则」和「怎么显示在屏幕上」分开写，好处是：

1. 游戏逻辑变成纯函数，可以脱离终端单独测试
2. 将来写网页版时，`game.py` 的逻辑可以原样翻译成 JavaScript
3. 出 bug 时能快速定位是「规则错了」还是「显示错了」

这就是「为测试而设计」——你会在这个阶段真正体会到它是什么意思。

还没有代码，M1 开始写。
