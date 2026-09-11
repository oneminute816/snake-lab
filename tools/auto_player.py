"""让程序自己玩贪吃蛇。

这是这个项目里第一段真正的「算法」—— 不再靠人按键，而是每走一步都
评估几种走法，挑出最好的那个。

用法：
    cd snake-lab
    .venv\\Scripts\\python.exe tools\\auto_player.py              # 玩一局
    .venv\\Scripts\\python.exe tools\\auto_player.py --games 20   # 玩 20 局看统计
    .venv\\Scripts\\python.exe tools\\auto_player.py --board      # 把棋盘画出来
    .venv\\Scripts\\python.exe tools\\auto_player.py --submit     # 提交到本地排行榜
"""

import argparse
import json
import sys
import urllib.error
import urllib.request
from collections import deque
from pathlib import Path

# 复用 M1 写的游戏规则和画面渲染。
#
# 这里往 sys.path 里插了一个目录 —— 一个脚本要 import 兄弟目录下的模块，
# 正经做法是把那个目录做成包，但对这个体量的项目来说太重了。
# 知道这是权宜之计就行：项目再大一点，就该改成正式的包结构。
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "python-prototype"))

from game import DIRECTIONS, OPPOSITE, Game, GameState  # noqa: E402
from main import render  # noqa: E402


def next_head(game: Game, direction: str) -> tuple[int, int]:
    """假设朝 direction 走一步，蛇头会到哪儿。"""
    dx, dy = DIRECTIONS[direction]
    return (game.snake.head[0] + dx, game.snake.head[1] + dy)


def free_space(game: Game, start: tuple[int, int], occupied: set) -> int:
    """从 start 出发，能走到多少个空格子（洪水填充）。

    这是判断「会不会把自己困死」的办法：走完这一步之后，
    从新蛇头出发还能摸到多少地方。空间越小，越危险。
    """
    seen = {start}
    queue = deque([start])

    while queue:
        x, y = queue.popleft()
        for dx, dy in DIRECTIONS.values():
            neighbour = (x + dx, y + dy)
            if neighbour in seen or neighbour in occupied:
                continue
            if not (0 <= neighbour[0] < game.width and 0 <= neighbour[1] < game.height):
                continue
            seen.add(neighbour)
            queue.append(neighbour)

    return len(seen) - 1  # 减掉起点自己


def space_after(game: Game, position: tuple[int, int]) -> int:
    """假设蛇头走到 position，之后还剩多少活动空间。"""
    occupied = set(game.snake.body)
    # 这一步尾巴会让开，所以它不该算障碍
    occupied.discard(game.snake.tail)
    occupied.add(position)
    return free_space(game, position, occupied)


def choose_direction(game: Game) -> str | None:
    """挑一个方向。全是死路时返回 None。

    策略分两层：

    1. 先筛掉会立刻死掉的走法（撞墙、撞自己），以及不能掉头
    2. 在活下来的走法里挑：先看会不会把自己困死，再看离食物近不近

    只做第 1 层的话，蛇会一头扎进死角 —— 它只看得见食物，
    看不见"吃完之后还出不出得来"。第 2 层就是补这个的。
    """
    candidates = []
    for name in DIRECTIONS:
        if name == OPPOSITE[game.snake.direction]:
            continue  # 不能掉头

        position = next_head(game, name)
        if game.collision_at(position) is not None:
            continue  # 这一步会死，不考虑

        candidates.append((name, position))

    if not candidates:
        return None

    def rank(candidate):
        _, position = candidate
        space = space_after(game, position)
        distance = abs(position[0] - game.food[0]) + abs(position[1] - game.food[1])
        # 排序键的含义：安全优先 → 离食物近 → 活动空间大
        risky = space < len(game.snake)
        return (risky, distance, -space)

    return min(candidates, key=rank)[0]


def play_one_game(seed: int | None = None) -> Game:
    """让 AI 玩一整局，返回结束时的 Game。"""
    game = Game(width=20, height=20, seed=seed)
    game.start()

    # 上限是防死循环的保险丝。正常永远不会碰到。
    limit = game.width * game.height * 100
    for _ in range(limit):
        if game.state is not GameState.RUNNING:
            break

        direction = choose_direction(game)
        if direction is None:
            # 三个方向全是死路。随便选一个，让它撞死，别在这儿空转。
            for name in DIRECTIONS:
                if name != OPPOSITE[game.snake.direction]:
                    game.snake.turn(name)
                    break
        else:
            game.snake.turn(direction)

        game.step()

    return game


def submit_score(url: str, name: str, score: int) -> dict:
    """把成绩提交到排行榜。用的是标准库，没装任何 HTTP 客户端。"""
    payload = json.dumps({"name": name, "score": score}).encode("utf-8")
    request = urllib.request.Request(
        f"{url.rstrip('/')}/api/scores",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(description="让程序自己玩贪吃蛇")
    parser.add_argument("--games", type=int, default=1, help="玩几局，默认 1")
    parser.add_argument("--seed", type=int, default=None, help="随机种子，指定后每局一样")
    parser.add_argument("--board", action="store_true", help="把最后一局的棋盘画出来")
    parser.add_argument("--submit", action="store_true", help="把最高分提交到排行榜")
    parser.add_argument("--url", default="http://localhost:3000", help="排行榜地址")
    parser.add_argument("--name", default="AI 贪吃蛇", help="提交时用的名字")
    args = parser.parse_args()

    scores = []
    last_game = None

    for index in range(args.games):
        seed = None if args.seed is None else args.seed + index
        game = play_one_game(seed=seed)
        scores.append(game.score)
        last_game = game

        if args.games > 1:
            reason = "撞死" if game.state is GameState.GAME_OVER else "结束"
            print(f"  第 {index + 1:>2} 局：{game.score:>4} 分，长度 {len(game.snake):>3}，{reason}")

    print()
    if len(scores) == 1:
        print(f"得分：{scores[0]}")
    else:
        print(f"局数：{len(scores)}")
        print(f"最高：{max(scores)}")
        print(f"平均：{sum(scores) / len(scores):.1f}")
        print(f"最低：{min(scores)}")

    if args.board and last_game is not None:
        print()
        print(render(last_game))

    if args.submit:
        best = max(scores)
        print()
        if best == 0:
            print("最高分是 0，就不提交了。")
            return
        try:
            saved = submit_score(args.url, args.name, best)
            print(f"已提交：{saved['name']} {saved['score']} 分（id={saved['id']}）")
        except urllib.error.URLError as error:
            print(f"提交失败：{error}")
            print("是不是忘了先 npm start？")
        except urllib.error.HTTPError as error:
            print(f"提交被拒：HTTP {error.code} {error.read().decode('utf-8', 'ignore')}")


if __name__ == "__main__":
    main()
