"""game.py 的单元测试。

测试函数的名字要说清楚「什么情况下会怎样」，而不是「测试某个函数」。
名字起得好，测试挂掉的那一刻你就知道坏在哪了。

运行：
    .venv\\Scripts\\python.exe -m pytest -v
"""

from game import DIRECTIONS, Death, Game, GameState, Snake, SCORE_PER_FOOD

# 一个棋盘外的坐标。拿来当「不存在的食物」，排除随机因素对测试的干扰。
OUTSIDE = (-1, -1)


def make_game(**kwargs) -> Game:
    """造一局游戏，并把食物挪到棋盘外。

    测试里最烦的是「这次没坏、下次坏了」。把随机因素固定住，结果才可信。
    """
    game = Game(**kwargs)
    game.food = OUTSIDE
    return game


def drive(game: Game, turns: list[str]) -> None:
    """按顺序转方向并各走一步。"""
    for direction in turns:
        game.snake.turn(direction)
        game.step()


# ─────────────────────────── Snake ───────────────────────────


def test_first_step_never_hits_own_body():
    """朝任何方向开局，第一步都不该踩到自己身上。

    这条曾经真的坏过：早期版本把身体固定往左排，朝左走时头一动
    就压在原来脖子的格子上。
    """
    for direction in DIRECTIONS:
        snake = Snake(direction=direction)
        snake.step()
        assert len(set(snake.body)) == len(snake.body)


def test_step_moves_head_by_one_cell():
    snake = Snake(start=(5, 5), direction="right")
    assert snake.step() == (6, 5)


def test_step_keeps_length_when_not_growing():
    snake = Snake(length=3)
    snake.step()
    assert len(snake) == 3


def test_grow_adds_one_segment():
    snake = Snake(length=3)
    snake.step(grow=True)
    assert len(snake) == 4


def test_reversing_direction_is_ignored():
    """朝右走时按左，不该被采纳 —— 那等于瞬间掉头撞自己的脖子。"""
    snake = Snake(direction="right")
    snake.turn("left")
    snake.step()
    assert snake.direction == "right"


def test_turn_only_takes_effect_on_the_next_step():
    """turn() 只是记录意图，真正转弯发生在下一步。

    这保证了玩家一秒内连按五次方向键，蛇每帧也最多只转一次弯。
    """
    snake = Snake(direction="right")
    snake.turn("up")
    assert snake.direction == "right"  # 还没生效
    snake.step()
    assert snake.direction == "up"  # 这一步才生效


# ─────────────────────────── Game ───────────────────────────


def test_new_game_waits_in_ready():
    game = Game()
    assert game.state is GameState.READY
    assert game.score == 0


def test_step_does_nothing_before_start():
    game = make_game()
    head = game.snake.head
    game.step()
    assert game.snake.head == head
    assert game.state is GameState.READY


def test_start_makes_the_snake_move():
    game = make_game()
    game.start()
    head = game.snake.head
    game.step()
    assert game.snake.head != head


def test_pause_freezes_the_snake():
    game = make_game()
    game.start()
    game.toggle_pause()
    head = game.snake.head
    game.step()
    assert game.snake.head == head
    assert game.state is GameState.PAUSED


def test_eating_scores_and_grows():
    game = make_game()
    game.start()
    game.food = game.snake.next_head()  # 把食物摆在正前方一格
    assert game.step() is True
    assert game.score == SCORE_PER_FOOD
    assert len(game.snake) == 4


def test_food_never_spawns_on_the_snake():
    """随机的代码只测一次不算数，跑满一批种子。"""
    for seed in range(200):
        game = Game(seed=seed)
        assert game.food not in game.snake.body


def test_hitting_the_wall_ends_the_game():
    game = make_game(width=10, height=10, start=(9, 5), direction="right")
    game.start()
    game.step()
    assert game.state is GameState.GAME_OVER
    assert game.death is Death.WALL


def test_hitting_yourself_ends_the_game():
    game = make_game(width=10, height=10, start=(5, 5), direction="right", length=5)
    game.start()
    drive(game, ["right", "down", "left", "up"])
    assert game.state is GameState.GAME_OVER
    assert game.death is Death.SELF


def test_moving_into_the_vacating_tail_is_safe():
    """绕一圈回来撞自己的尾巴尖不算死 —— 这一步尾巴正好让开那一格。

    这是贪吃蛇最容易写错的细节：判断「会不会撞到自己」时，
    必须先把即将让开的尾格从障碍集合里去掉。
    """
    game = make_game(width=10, height=10, start=(5, 5), direction="right", length=4)
    game.start()
    drive(game, ["right", "down", "left", "up"])
    assert game.state is GameState.RUNNING
    assert game.death is None


def test_game_over_stays_over():
    """已经结束的局，再调用 step() 不该有任何变化。"""
    game = make_game(width=10, height=10, start=(9, 5), direction="right")
    game.start()
    game.step()
    head = game.snake.head
    game.step()
    assert game.snake.head == head
    assert game.state is GameState.GAME_OVER


def test_reset_restores_a_clean_slate():
    game = make_game(width=10, height=10, start=(9, 5), direction="right")
    game.start()
    game.step()
    assert game.state is GameState.GAME_OVER

    game.reset()
    assert game.state is GameState.READY
    assert game.score == 0
    assert game.death is None
    assert len(game.snake) == 3
    assert game.snake.head == (9, 5)
