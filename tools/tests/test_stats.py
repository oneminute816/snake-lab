"""统计分析工具的测试。"""

import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from stats import format_report, load_scores, summarize, top_scores  # noqa: E402

ROWS = [
    {"name": "小明", "score": 120, "created_at": "2026-09-10T10:00:00"},
    {"name": "小红", "score": 340, "created_at": "2026-09-10T11:00:00"},
    {"name": "小明", "score": 200, "created_at": "2026-09-11T09:00:00"},
    {"name": "小红", "score": 90, "created_at": "2026-09-11T12:00:00"},
]


def make_db(path: Path, rows: list[dict]) -> None:
    """造一个和 Node 那边结构一样的数据库出来。"""
    connection = sqlite3.connect(path)
    connection.execute(
        """
        CREATE TABLE scores (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          name       TEXT    NOT NULL,
          score      INTEGER NOT NULL,
          created_at TEXT    NOT NULL
        )
        """
    )
    connection.executemany(
        "INSERT INTO scores (name, score, created_at) VALUES (:name, :score, :created_at)",
        rows,
    )
    connection.commit()
    connection.close()


def test_empty_summary_does_not_crash():
    summary = summarize([])
    assert summary["games"] == 0
    assert "还没有成绩" in format_report(summary, [])


def test_summarize_counts_games():
    assert summarize(ROWS)["games"] == 4


def test_summarize_finds_the_best_score():
    assert summarize(ROWS)["best"] == 340


def test_summarize_computes_average_and_median():
    summary = summarize(ROWS)
    assert summary["average"] == pytest.approx(187.5)
    # 排序后是 90 / 120 / 200 / 340，中位数取中间两个的平均
    assert summary["median"] == pytest.approx(160.0)


def test_summarize_groups_by_player():
    by_player = {row["name"]: row for row in summarize(ROWS)["by_player"]}
    assert by_player["小明"]["games"] == 2
    assert by_player["小明"]["best"] == 200
    assert by_player["小红"]["best"] == 340


def test_summarize_groups_by_day():
    by_day = summarize(ROWS)["by_day"]
    assert [row["day"] for row in by_day] == ["2026-09-10", "2026-09-11"]
    assert by_day[0]["games"] == 2
    assert by_day[0]["best"] == 340
    assert by_day[1]["best"] == 200


def test_top_scores_are_sorted_by_score_then_time():
    """排序规则必须和后端接口一致，否则两边看到的榜单不一样。"""
    top = top_scores(ROWS, 10)
    assert [row["score"] for row in top] == [340, 200, 120, 90]

    # 同分时先提交的排前面
    tied = [
        {"name": "后交的", "score": 100, "created_at": "2026-09-11T12:00:00"},
        {"name": "先交的", "score": 100, "created_at": "2026-09-11T09:00:00"},
    ]
    assert [row["name"] for row in top_scores(tied, 10)] == ["先交的", "后交的"]


def test_top_scores_respects_the_limit():
    assert len(top_scores(ROWS, 2)) == 2


def test_load_scores_reads_a_real_database(tmp_path):
    db_path = tmp_path / "scores.db"
    make_db(db_path, ROWS)

    rows = load_scores(db_path)
    assert len(rows) == 4
    assert {row["name"] for row in rows} == {"小明", "小红"}


def test_load_scores_opens_read_only(tmp_path):
    """只读打开：文件不存在时它会报错，而不是顺手建一个新库出来。

    统计脚本只该看数据，不该有本事改它 —— 想改都改不了才是真的安全。
    """
    missing = tmp_path / "不存在.db"
    with pytest.raises(sqlite3.OperationalError):
        load_scores(missing)
    assert not missing.exists()


def test_report_contains_the_numbers():
    report = format_report(summarize(ROWS), top_scores(ROWS, 3))
    assert "总局数    4" in report
    assert "340" in report
    assert "小明" in report
