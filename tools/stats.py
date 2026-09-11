"""读分数数据库，生成一份统计报告。

用的全是 Python 标准库（sqlite3 + statistics），不用装任何东西。

有个细节值得注意：这个 .db 文件是 Node.js 那边用 node:sqlite 写进去的，
现在用 Python 的 sqlite3 读出来 —— 两个语言、两个驱动、同一个文件。
能这样是因为 SQLite 的文件格式是公开标准，不是哪家公司私有的东西。

用法：
    cd snake-lab
    .venv\\Scripts\\python.exe tools\\stats.py
    .venv\\Scripts\\python.exe tools\\stats.py --top 5
    .venv\\Scripts\\python.exe tools\\stats.py --db web\\data\\scores.db
"""

import argparse
import sqlite3
import statistics
from collections import Counter
from pathlib import Path

# 默认去项目里的 web/data/scores.db 找。
# __file__ 是 .../snake-lab/tools/stats.py，往上两级就是 snake-lab/。
DEFAULT_DB = Path(__file__).resolve().parent.parent / "web" / "data" / "scores.db"


def load_scores(db_path: Path) -> list[dict]:
    """把全部成绩读出来。

    用只读模式打开（URI 里的 mode=ro）—— 这个脚本只该看数据，
    不该有本事改它或者建新库。想改都改不了，才是真的安全。
    """
    connection = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        rows = connection.execute(
            "SELECT name, score, created_at FROM scores"
        ).fetchall()
    finally:
        connection.close()

    return [dict(row) for row in rows]


def summarize(rows: list[dict]) -> dict:
    """把一堆原始记录算成一份摘要。"""
    if not rows:
        return {
            "games": 0,
            "best": 0,
            "average": 0.0,
            "median": 0.0,
            "by_player": [],
            "by_day": [],
        }

    scores = [row["score"] for row in rows]

    # 每个玩家玩了几局、最高多少
    pairs = Counter(row["name"] for row in rows)
    best_by_player: dict[str, int] = {}
    for row in rows:
        best_by_player[row["name"]] = max(
            best_by_player.get(row["name"], 0), row["score"]
        )
    by_player = [
        {"name": name, "games": count, "best": best_by_player[name]}
        for name, count in pairs.most_common()
    ]

    # 按日期分组。created_at 是 ISO 格式，前 10 个字符就是 YYYY-MM-DD。
    by_day: dict[str, list[int]] = {}
    for row in rows:
        day = row["created_at"][:10]
        by_day.setdefault(day, []).append(row["score"])
    by_day_list = [
        {"day": day, "games": len(values), "best": max(values)}
        for day, values in sorted(by_day.items())
    ]

    return {
        "games": len(rows),
        "best": max(scores),
        "average": sum(scores) / len(scores),
        "median": statistics.median(scores),
        "by_player": by_player,
        "by_day": by_day_list,
    }


def top_scores(rows: list[dict], limit: int) -> list[dict]:
    """前几名。排序规则必须和后端接口保持一致，否则两边看到的榜单不一样。"""
    return sorted(rows, key=lambda row: (-row["score"], row["created_at"]))[:limit]


def format_report(summary: dict, top: list[dict]) -> str:
    """把摘要排版成给人看的文本。"""
    lines: list[str] = []

    if summary["games"] == 0:
        return "数据库里还没有成绩。\n先 npm start 玩一局，或者跑 tools/auto_player.py --submit。"

    lines.append("🐍 贪吃蛇分数报告")
    lines.append("=" * 34)
    lines.append(f"总局数    {summary['games']}")
    lines.append(f"最高分    {summary['best']}")
    lines.append(f"平均分    {summary['average']:.1f}")
    lines.append(f"中位数    {summary['median']:.1f}")
    lines.append("")

    lines.append("🏆 排行榜")
    for index, row in enumerate(top, 1):
        lines.append(f"  {index:>2}. {row['name']:<16} {row['score']:>6}")
    lines.append("")

    lines.append("👤 各玩家")
    for player in summary["by_player"]:
        lines.append(f"  {player['name']:<16} {player['games']:>3} 局   最高 {player['best']}")
    lines.append("")

    lines.append("📅 按日期")
    for day in summary["by_day"]:
        lines.append(f"  {day['day']}   {day['games']:>3} 局   最高 {day['best']}")

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="看看排行榜的统计数据")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="数据库文件路径")
    parser.add_argument("--top", type=int, default=10, help="排行榜显示前几名")
    args = parser.parse_args()

    if not args.db.exists():
        print(f"找不到数据库：{args.db}")
        print("先 npm start 玩一局，或者跑 tools/auto_player.py --submit")
        return

    rows = load_scores(args.db)
    print(format_report(summarize(rows), top_scores(rows, args.top)))


if __name__ == "__main__":
    main()
