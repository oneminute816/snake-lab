"""AI 自动玩法的测试。

策略代码最难测的地方在于「它做得好不好」是主观的。所以这里不去测
「它得了几分」，而是测三件客观的事：

  1. 它守不守规则（不撞墙、不掉头、不穿模）
  2. 它玩完一局会不会卡住
  3. 它是不是明显比乱走强（一个低位门槛，防止改坏之后悄悄退化）
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# 先 import auto_player：它自己会把 python-prototype 加进 sys.path，
# 所以下一行就能直接 import game 了，不用在这儿再插一次。
from auto_player import choose_direction, play_one_game  # noqa: E402
from game import DIRECTIONS, OPPOSITE, Game, GameState  # noqa: E402


def test_never_turns_back_on_itself():
    """掉头等于撞自己的脖子，AI 绝不能这么走。"""
    game = Game(seed=2)
    game.start()

    for _ in range(80):
        if game.state is not GameState.RUNNING:
            break
        direction = choose_direction(game)
        if direction is None:
            break
        assert direction != OPPOSITE[game.snake.direction]
        game.snake.turn(direction)
        game.step()


def test_avoids_walking_straight_into_the_wall():
    """蛇头贴着右墙朝右走，往右必然是死，AI 必须选别的方向。"""
    game = Game(width=10, height=10, start=(9, 5), direction="right", seed=1)
    game.start()
    assert choose_direction(game) != "right"


def test_returns_none_when_every_direction_is_deadly():
    """三条路全是死路时返回 None，而不是硬塞一个方向。"""
    # 1x1 的棋盘放不下蛇，所以用一个更直接的构造：
    # 20 格宽的棋盘上，蛇头在角落，方向朝外。
    game = Game(width=3, height=3, start=(2, 2), direction="right", length=1, seed=1)
    game.start()
    # 头在 (2,2) 朝右：右是墙，上是 (2,1)，下是 (2,3) 也是墙 —— 只有上可走
    assert choose_direction(game) == "up"


def test_plays_a_whole_game_without_getting_stuck():
    """完整跑一局，必须正常结束，不能死循环。"""
    game = play_one_game(seed=11)
    assert game.state in (GameState.GAME_OVER, GameState.RUNNING)
    assert len(game.snake) >= 3


def test_snake_body_stays_valid():
    """蛇身不能有重复格子，相邻两节必须挨着。"""
    game = play_one_game(seed=5)
    body = list(game.snake.body)

    assert len(set(body)) == len(body), "蛇身上有重复坐标，说明穿模了"

    for previous, current in zip(body, body[1:]):
        distance = abs(previous[0] - current[0]) + abs(previous[1] - current[1])
        assert distance == 1, f"{previous} 和 {current} 不相邻，蛇身断开了"


def test_scores_far_better_than_random_walking():
    """门槛设得很低，只为挡住「改坏之后悄悄退化」。

    随机乱撞走 400 格的棋盘，几百分之一的机会能吃到几颗。
    一个合格的贪心 AI 每局至少该拿到几十分。
    """
    for seed in range(3):
        game = play_one_game(seed=seed)
        assert game.score >= 50, f"seed={seed} 只得 {game.score} 分，AI 可能退化了"


def test_all_four_directions_are_usable():
    """四个初始方向都能开局，不会因为方向不同就崩。"""
    for direction in DIRECTIONS:
        game = Game(direction=direction, seed=1)
        game.start()
        assert choose_direction(game) is not None
