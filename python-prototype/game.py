"""贪吃蛇的核心游戏逻辑。

这个文件只回答一个问题：**下一步，蛇会变成什么样？**

它不打印任何东西，也不知道终端、画布、键盘的存在 —— 那些是 main.py 的事。
把「规则」和「显示」分开写，规则就能脱离界面单独测试，这是本阶段最重要的一课。
"""

from collections import deque

# 四个方向，值是从当前格子走到下一个格子的位移 (dx, dy)。
# 注意 y 轴是向下的：up 是 y - 1，不是 y + 1。
DIRECTIONS: dict[str, tuple[int, int]] = {
    "up": (0, -1),
    "down": (0, 1),
    "left": (-1, 0),
    "right": (1, 0),
}

# 每个方向的反方向。蛇不能原地掉头（那等于撞上自己的脖子），
# 所以玩家输入新方向时，要先拿这张表查一遍。
OPPOSITE: dict[str, str] = {
    "up": "down",
    "down": "up",
    "left": "right",
    "right": "left",
}

# 坐标类型别名：一个 (x, y) 的格子
Position = tuple[int, int]


class Snake:
    """一条蛇。

    蛇身用 deque（双端队列）存坐标，**队首是蛇头，队尾是蛇尾**。

    为什么用 deque 而不是 list？因为每走一步都要「头部插入 + 尾部删除」，
    deque 做这两件事都是瞬间完成，而 list 在头部插入需要把后面所有元素
    往后挪一遍。蛇不长的时候感觉不出来，但这属于写之前就该想对的事。
    """

    def __init__(
        self,
        start: Position = (5, 5),
        direction: str = "right",
        length: int = 3,
    ) -> None:
        if direction not in DIRECTIONS:
            raise ValueError(f"未知方向：{direction}")
        if length < 1:
            raise ValueError("蛇至少要有 1 节")

        self.direction = direction
        # 玩家按下的新方向先存在这里，真正移动时才生效。
        # 为什么要两个变量？见 turn() 的注释。
        self.next_direction = direction

        # 身体从蛇头往「身后」依次排开，摆出初始长度。
        #
        # 「身后」就是前进方向的反方向。朝右走身体在左边，朝上走身体在下方。
        # 这里千万别写死成「永远往左」—— 那样朝左走时，头往前一步正好踩在
        # 原来脖子的格子上，一开局就自己撞死自己。
        dx, dy = DIRECTIONS[direction]
        head_x, head_y = start
        self.body: deque[Position] = deque(
            (head_x - dx * i, head_y - dy * i) for i in range(length)
        )

    @property
    def head(self) -> Position:
        """蛇头坐标。"""
        return self.body[0]

    @property
    def tail(self) -> Position:
        """蛇尾坐标。"""
        return self.body[-1]

    def turn(self, direction: str) -> None:
        """记录玩家想转的方向。

        这里有个经典坑：如果不做检查，玩家在一帧之内连按「上」和「左」，
        蛇会先掉头撞上自己。所以和当前方向相反的输入直接忽略。

        注意只改了 next_direction，没有改 direction —— 这样一帧内按五次
        方向键也不会让蛇瞬移，它每帧最多转一次弯。
        """
        if direction not in DIRECTIONS:
            raise ValueError(f"未知方向：{direction}")
        if direction == OPPOSITE[self.direction]:
            return  # 想掉头？当作没听见
        self.next_direction = direction

    def step(self, grow: bool = False) -> Position:
        """往前走一步，返回新的蛇头坐标。

        grow=True 时不砍掉尾巴，蛇就长了一节 —— 吃到食物的时候用。
        这是「吃到食物变长」最简洁的实现方式：变长不是加上一节，
        而是本次不删除尾巴。
        """
        self.direction = self.next_direction
        dx, dy = DIRECTIONS[self.direction]
        new_head = (self.head[0] + dx, self.head[1] + dy)

        self.body.appendleft(new_head)  # 新头入队
        if not grow:
            self.body.pop()             # 尾巴出队，长度不变

        return new_head

    def __len__(self) -> int:
        """len(蛇) 得到蛇的长度。"""
        return len(self.body)

    def __repr__(self) -> str:
        return f"Snake(direction={self.direction!r}, body={list(self.body)})"
