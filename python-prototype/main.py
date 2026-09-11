"""命令行版贪吃蛇 —— 把 game.py 的规则显示到终端上。

这个文件只做三件事：读键盘、到点推进一步、把画面画出来。
**游戏规则一行都不该出现在这里**，全在 game.py 里。

运行：
    .venv\\Scripts\\python.exe main.py
"""

import sys
import time

from game import DIRECTIONS, Death, Game, GameState

try:
    import msvcrt  # Windows 专有的键盘读取模块
except ImportError:  # pragma: no cover - 非 Windows 平台
    msvcrt = None


# ── 画面里用到的字符 ──────────────────────────────────────
HEAD = "@"
BODY = "o"
FOOD = "*"
EMPTY = "  "

HINT = "方向键 / WASD 移动    P 暂停    R 重开    Q 退出"

# ── 键盘映射 ─────────────────────────────────────────────
# 方向键在 Windows 上会先送来一个引导字节（\x00 或 \xe0），再送来一个字母。
ARROW_KEYS = {b"H": "up", b"P": "down", b"K": "left", b"M": "right"}
WASD_KEYS = {b"w": "up", b"s": "down", b"a": "left", b"d": "right"}


def read_key() -> str | None:
    """读一个按键。没有按键按过就返回 None。

    返回的是「意图」而不是原始字节：方向返回 "up" / "down" / "left" / "right"，
    功能键返回 "start" / "pause" / "reset" / "quit"。

    这样 main() 里的判断逻辑和键盘布局解耦了 —— 想加一套 vim 键位，
    只要往 WASD_KEYS 里加映射，主循环一行都不用改。
    """
    if msvcrt is None or not msvcrt.kbhit():
        return None

    key = msvcrt.getch()

    if key in (b"\x00", b"\xe0"):  # 方向键：引导字节后面才是真正的键
        return ARROW_KEYS.get(msvcrt.getch())

    if key in WASD_KEYS:
        return WASD_KEYS[key]

    if key == b" ":
        return "start"
    if key in (b"p", b"P"):
        return "pause"
    if key in (b"r", b"R"):
        return "reset"
    if key in (b"q", b"Q", b"\x1b"):  # q 或 Esc
        return "quit"

    return None


def status_text(game: Game) -> str:
    """状态栏那一行。"""
    if game.state is GameState.READY:
        state = "按空格开始"
    elif game.state is GameState.RUNNING:
        state = "进行中"
    elif game.state is GameState.PAUSED:
        state = "已暂停（按 P 继续）"
    else:
        reason = {Death.WALL: "撞到墙了", Death.SELF: "咬到自己了"}.get(game.death, "")
        state = f"游戏结束 —— {reason}（按 R 重开）"

    return f"分数 {game.score}    长度 {len(game.snake)}    {state}"


def render(game: Game) -> str:
    """把当前局面画成一整块文本。

    这是个纯函数：同一个 game 一定画出同样的画面，不依赖时间、
    不依赖终端、不依赖任何外部状态。所以它能直接被测试，
    不需要真的开一个终端窗口去肉眼看。

    「把渲染和终端隔开」是让界面代码可测的关键一招。
    """
    body = set(game.snake.body)
    border = "+" + "-" * (game.width * 2) + "+"

    lines = [border]
    for y in range(game.height):
        row = ["|"]
        for x in range(game.width):
            cell = (x, y)
            if cell == game.snake.head:
                row.append(HEAD + " ")
            elif cell in body:
                row.append(BODY + " ")
            elif cell == game.food:
                row.append(FOOD + " ")
            else:
                row.append(EMPTY)
        row.append("|")
        lines.append("".join(row))
    lines.append(border)

    lines.append(status_text(game))
    lines.append(HINT)
    return "\n".join(lines) + "\n"


def draw(game: Game) -> None:
    """把画面刷到终端上。

    \x1b[H 是「光标回到左上角」。配合每帧重画整块内容，
    画面会原地更新而不是一行行往下滚。这比每帧清屏的写法
    舒服得多 —— 清屏会让画面闪。
    """
    sys.stdout.write("\x1b[H" + render(game))
    sys.stdout.flush()


def main() -> None:
    # 每帧间隔，秒。数字越小蛇跑得越快，想调难度就调这一个数。
    frame_seconds = 0.12

    game = Game(width=20, height=20)

    if msvcrt is None:
        print("这个版本用的是 Windows 的键盘接口，需要在 Windows 终端里运行。")
        return

    sys.stdout.write("\x1b[2J")      # 开场清一次屏
    sys.stdout.write("\x1b[?25l")    # 藏起光标，免得它在画面上乱跳

    changed = True
    last_tick = time.perf_counter()

    try:
        while True:
            key = read_key()
            if key == "quit":
                break
            if key is not None:
                changed = True
                if key == "start":
                    game.start()
                elif key == "pause":
                    game.toggle_pause()
                elif key == "reset":
                    game.reset()
                elif key in DIRECTIONS:
                    game.snake.turn(key)

            now = time.perf_counter()
            if now - last_tick >= frame_seconds:
                last_tick = now
                # 只有真的在跑才推进。否则蛇停在原地，画面也不会变，
                # 每秒重画十几次纯属浪费 —— 实测这一条能把输出量减少 90% 以上。
                if game.state is GameState.RUNNING:
                    game.step()
                    changed = True

            # 只在画面真的变了才重画。静止时每秒刷十几次纯属浪费，
            # 而且刷得越勤越容易看出闪。
            if changed:
                draw(game)
                changed = False

            time.sleep(0.01)  # 让出 CPU，别把一颗核心跑满
    except KeyboardInterrupt:
        pass
    finally:
        sys.stdout.write("\x1b[?25h")  # 恢复光标 —— 这一步不能省，
        sys.stdout.write("\x1b[2J\x1b[H")  # 否则退出后终端里看不见光标了
        # 这里不要用 emoji。输出被重定向到文件时，Python 会用系统区域编码
        # （中文 Windows 上是 GBK），而 emoji 不在 GBK 里，会直接抛
        # UnicodeEncodeError —— 而且是在退出的最后一刻才炸。
        print("再见")


if __name__ == "__main__":
    main()
