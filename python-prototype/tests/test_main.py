"""main.py 画面渲染的测试。

界面代码通常很难测 —— 但它难测是因为「画什么」和「往哪画」混在一起。
这里 render() 只负责「画什么」：给它一个 Game，吐出一段文本，
不碰终端、不看时间。所以它能像普通函数一样测。
把这两件事分开，是让界面代码可测的关键一招。
"""

from game import Game, GameState
from main import BODY, FOOD, HEAD, render, status_text


def make_game(**overrides) -> Game:
    options = dict(width=10, height=6, start=(3, 2), direction="right", length=3)
    options.update(overrides)
    game = Game(**options)
    game.food = (0, 5)  # 固定食物位置，画面才是可预期的
    return game


def board_lines(game: Game) -> list[str]:
    """剥掉上下边框和状态栏，只留下棋盘本身。"""
    return render(game).splitlines()[1 : 1 + game.height]


def cell_at(game: Game, x: int, y: int) -> str:
    """取出某个格子上画的字符。每格占 2 个字符，行首还有 1 个左边框。"""
    return board_lines(game)[y][1 + x * 2]


def test_board_is_as_tall_as_the_game():
    assert len(board_lines(make_game())) == 6


def test_all_board_rows_are_the_same_width():
    game = make_game()
    lines = render(game).splitlines()[: game.height + 2]
    assert len({len(line) for line in lines}) == 1


def test_head_body_and_food_are_drawn_in_the_right_cells():
    game = make_game()
    # 蛇从 (3,2) 朝右，身体依次排在身后
    assert cell_at(game, 3, 2) == HEAD
    assert cell_at(game, 2, 2) == BODY
    assert cell_at(game, 1, 2) == BODY
    assert cell_at(game, 0, 5) == FOOD


def test_empty_cells_are_blank():
    game = make_game()
    assert cell_at(game, 9, 0).strip() == ""


def test_status_line_reports_each_state():
    game = make_game()
    assert "按空格开始" in status_text(game)

    game.start()
    assert "进行中" in status_text(game)

    game.toggle_pause()
    assert "已暂停" in status_text(game)


def test_status_line_says_why_the_game_ended():
    game = make_game(start=(9, 2))
    game.start()
    game.step()  # 撞右边墙
    assert game.state is GameState.GAME_OVER
    assert "撞到墙了" in status_text(game)


def test_status_line_shows_score_and_length():
    game = make_game()
    game.start()
    game.food = game.snake.next_head()
    game.step()
    status = status_text(game)
    assert "分数 10" in status
    assert "长度 4" in status
