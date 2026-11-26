import json
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "voc"))
import collect_public_board as board


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
