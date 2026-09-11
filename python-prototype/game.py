"""贪吃蛇的核心游戏逻辑。

这个文件只回答一个问题：**下一步，蛇会变成什么样？**

它不打印任何东西，也不知道终端、画布、键盘的存在 —— 那些是 main.py 的事。
把「规则」和「显示」分开写，规则就能脱离界面单独测试，这是本阶段最重要的一课。
"""

import random
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

# 吃到一颗食物的得分。写在这里而不是散落在代码里，
# 以后想改成分数随长度递增，只需要动这一处。
SCORE_PER_FOOD = 10


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

    def next_head(self) -> Position:
        """按「下一步方向」算出的新蛇头位置 —— 此时蛇还没真的移动。

        为什么要单独一个方法？因为 Game 需要**提前**知道头会走到哪，
        才能判断这一步到底吃没吃到食物。
        """
        dx, dy = DIRECTIONS[self.next_direction]
        return (self.head[0] + dx, self.head[1] + dy)

    def step(self, grow: bool = False) -> Position:
        """往前走一步，返回新的蛇头坐标。

        grow=True 时不砍掉尾巴，蛇就长了一节 —— 吃到食物的时候用。
        这是「吃到食物变长」最简洁的实现方式：变长不是加上一节，
        而是本次不删除尾巴。
        """
        self.direction = self.next_direction
        new_head = self.next_head()

        self.body.appendleft(new_head)  # 新头入队
        if not grow:
            self.body.pop()             # 尾巴出队，长度不变

        return new_head

    def __len__(self) -> int:
        """len(蛇) 得到蛇的长度。"""
        return len(self.body)

    def __repr__(self) -> str:
        return f"Snake(direction={self.direction!r}, body={list(self.body)})"


class Game:
    """一局游戏。

    Snake 只管「蛇自己怎么动」，Game 管它和世界的关系：
    棋盘多大、食物在哪、这一步吃到没有、得了多少分。

    这样分工的好处：以后要加排行榜、加难度等级、加障碍物，
    改动都集中在 Game 里，Snake 不用动。
    """

    def __init__(
        self,
        width: int = 20,
        height: int = 20,
        start: Position = (5, 5),
        direction: str = "right",
        length: int = 3,
        seed: int | None = None,
    ) -> None:
        if width < 2 or height < 2:
            raise ValueError("棋盘至少要有 2x2")

        self.width = width
        self.height = height
        self.score = 0

        # 用自己独立的 Random 实例，而不是 random.choice 这类全局函数。
        # 关键在于：传了 seed 之后，食物出现的顺序每次运行都一模一样。
        # 否则你没法写「第 3 步应该吃到食物」这种测试 —— 随机的东西测不了。
        self.rng = random.Random(seed)

        self.snake = Snake(start=start, direction=direction, length=length)
        self.food: Position | None = None
        self.spawn_food()

    @property
    def has_won(self) -> bool:
        """蛇占满整个棋盘就算通关 —— 理论可行，实战几乎遇不到。"""
        return self.food is None

    def free_cells(self) -> list[Position]:
        """棋盘上所有还没被蛇占的格子。"""
        occupied = set(self.snake.body)
        return [
            (x, y)
            for x in range(self.width)
            for y in range(self.height)
            if (x, y) not in occupied
        ]

    def spawn_food(self) -> Position | None:
        """把食物随机放到一个空格子上，返回它的坐标。

        `if not free` 处理的是「蛇把棋盘占满了」的情况。
        这属于理论上可能、实战几乎遇不到的边界情况，但还是要写：
        不写的话，从空列表里随机取一个会直接抛异常，而且报错信息
        完全看不出和「蛇赢了」有什么关系。
        """
        free = self.free_cells()
        if not free:
            self.food = None
            return None
        self.food = self.rng.choice(free)
        return self.food

    def step(self) -> bool:
        """推进一帧，返回这一步是否吃到了食物。

        顺序很讲究：先算出头**将要**走到哪，比对食物位置，再决定这次
        要不要变长。不能先移动再判断 —— 那时候蛇头已经站在食物格子上了，
        你没法区分它是刚到的，还是本来就在那。
        """
        ate = self.snake.next_head() == self.food

        self.snake.step(grow=ate)

        if ate:
            self.score += SCORE_PER_FOOD
            self.spawn_food()  # 吃掉一颗，立刻在别处补一颗

        return ate

    def __repr__(self) -> str:
        return (
            f"Game(score={self.score}, length={len(self.snake)}, "
            f"head={self.snake.head}, food={self.food})"
        )
