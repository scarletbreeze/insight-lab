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
                         divTp2="a", ttl="신호검색 관련 비공개 표본", maxGrpStep=number, minGrpStep=number)]

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
            with self.assertRaisesRegex(ValueError, "differ"):
                board.collect(first, last, 3, 100, True, True, checkpoint=checkpoint)


if __name__ == "__main__":
    unittest.main()
