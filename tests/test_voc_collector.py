import json
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "voc"))
import collect_public_board as board
from review_classifications import summarize
from summarize_topic_observations import build as build_observations

DATA = Path(__file__).resolve().parents[1] / "data" / "voc"


class TopicClassificationTest(unittest.TestCase):
    def test_title_and_channel_context(self):
        cases = [
            ("HTS에서 이체", "수식", "transfer"),
            ("영웅문4 화면번호와 이체", "", "ambiguous"),
            ("미수 이자", "인증서", "credit"),
            ("수식 문의", "입출금", "hts"),
            ("문의", "프리마켓", "hours"),
            ("조회한 계좌 거래내역", "다른 문의", "account"),
            ("화면 툴바", "", "hts"),
            ("챠트 설정", "", "hts"),
            ("DDE 연결", "", "hts"),
            ("비밀번호 저장", "주문 문의", "auth"),
            ("외화 RP", "", "products"),
            ("양도세 조회", "", "fees"),
            ("주식선물", "", "hours"),
            ("문의", "", "unclassified"),
        ]
        for title, body, expected in cases:
            with self.subTest(title=title, body=body):
                self.assertEqual(board.classify_topic(dict(ttl=title, dtlCntn=body)), expected)


class ClassificationReviewTest(unittest.TestCase):
    def test_disagreements_and_deferred_titles_reconcile(self):
        sample = {"2026": [[str(k) * 8, "비공개", prediction] for k, prediction in
                           enumerate(("hts", "ambiguous", "unclassified", "orders", "fees"))]}
        labels = {key: ("?" if index == 4 else "hts") for index, (key, _, _) in enumerate(sample["2026"])}
        result = summarize(sample, labels)
        self.assertEqual(result["years"], [dict(year=2026, sample=5, reviewed=4, agreement=1)])
        self.assertEqual(result["differences"], dict(unclassified=1, ambiguous=1, differentTopic=1))
        self.assertNotIn("비공개", str(result))


class LocalCheckpointTest(unittest.TestCase):
    def test_resume_matches_uninterrupted_aggregation(self):
        def page(number, cursor, size):
            self.assertEqual(cursor["prevPageNo"], number - 1 if number > 1 else "")
            day = ["2022.01.02", "2022.01.01", "2021.12.31"][number - 1]
            return [dict(step=1, seqid=number, pareSeqid=0, mngrYn="N", makeTime=day,
                         divTp2="a", ttl="신호검색 관련 비공개 표본 [0130] 0130번 화면 [0341]", maxGrpStep=number, minGrpStep=number)]

        first, last = date(2022, 1, 1), date(2022, 1, 2)
        with tempfile.TemporaryDirectory() as directory, patch.object(board, "fetch_with_retry", page), patch.object(board.time, "sleep"):
            checkpoint = Path(directory) / "progress.json"
            expected = board.collect(first, last, 3, 20, True, True)
            partial = board.collect(first, last, 1, 20, True, True, checkpoint=checkpoint)
            self.assertEqual(partial["stop"], "page-limit")
            state = json.loads(checkpoint.read_text())
            self.assertNotIn("비공개 표본", checkpoint.read_text())
            self.assertTrue(all(len(key) == 64 for key in state["customers"]))
            actual = board.collect(first, last, 3, 20, True, True, checkpoint=checkpoint)
            self.assertEqual(actual, expected)
            self.assertEqual(actual["topicCounts"], {2022: {"hts": 2}})
            screen_state = Path(directory) / "screens.json"
            codes = {"0130", "0341"}
            board.collect(first, last, 1, 20, screen_numbers=codes, checkpoint=screen_state)
            resumed = board.collect(first, last, 3, 20, screen_numbers=codes, checkpoint=screen_state)
            self.assertEqual(resumed["matchedThreads"], 2)
            self.assertEqual(resumed["screens"], {"0130": 2, "0341": 2})
            self.assertNotIn("비공개 표본", screen_state.read_text())
            with self.assertRaisesRegex(ValueError, "differ"):
                board.collect(first, last, 3, 20, screen_numbers={"0130"}, checkpoint=screen_state)
            with self.assertRaisesRegex(ValueError, "differ"):
                board.collect(first, last, 3, 100, True, True, checkpoint=checkpoint)




class TopicMetadataTest(unittest.TestCase):
    def test_keyword_families_follow_the_collector_rules(self):
        topics = json.loads((DATA / "topics.json").read_text(encoding="utf-8"))
        self.assertEqual({topic["id"] for topic in topics} - {"other"}, set(board.TOPIC_PATTERNS))
        for topic in topics:
            for keyword in topic["keywords"]:
                with self.subTest(topic=topic["id"], keyword=keyword):
                    self.assertRegex(keyword, board.TOPIC_PATTERNS[topic["id"]])
                    others = [other for other, pattern in board.TOPIC_PATTERNS.items() if other != topic["id"] and pattern.search(keyword)]
                    self.assertEqual(others, [], f"{keyword} also matches {others}")


class TopicObservationTest(unittest.TestCase):
    def test_published_observations_reproduce_from_monthly_aggregates(self):
        monthly = json.loads((DATA / "monthly-topics.json").read_text(encoding="utf-8"))
        windows = json.loads((DATA / "notice-windows.json").read_text(encoding="utf-8"))
        stored = json.loads((DATA / "topic-observations.json").read_text(encoding="utf-8"))
        self.assertEqual(build_observations(monthly, windows), stored)

    def test_templates_stay_short_and_descriptive(self):
        monthly = {"end": "2024-11-25", "months": {
            **{f"2024-{m:02d}": {"orders": 40 + m, "hours": 3} for m in range(1, 11)},
            "2024-11": {"orders": 900, "hours": 2},
        }}
        result = build_observations(monthly, {"observations": [{"date": "2024-11-03", "topic": "orders"}]})
        by_topic = {row["topic"]: row for row in result["observations"]}
        self.assertEqual(set(by_topic), {"orders", "hours"})
        self.assertIn("11월 900건", by_topic["orders"]["observation"])
        self.assertIn("공지 전후 14일 관찰 1건", by_topic["orders"]["basis"])
        self.assertTrue(by_topic["hours"]["observation"].startswith("11월 25일까지"))
        for row in result["observations"]:
            self.assertLessEqual(len(row["observation"]), result["maxLength"])


if __name__ == "__main__":
    unittest.main()
