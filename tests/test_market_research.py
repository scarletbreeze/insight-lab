import io
import sys
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "market"))
from collect_tiger_holdings import collect


class TigerHoldingsTest(unittest.TestCase):
    def test_checks_fund_date_and_full_row_count(self):
        fund = "KR7102110004"
        day = date(2024, 11, 1)
        form = f'<input name="ksdFund" value="{fund}"><input name="fixDate" value="2024.11.01">'
        table = '<tr data-tot-cnt="1"><td>005930</td><td>삼성전자</td></tr>'
        cases = [(form, table, True), (form.replace("11.01", "10.31"), table, False),
                 (form.replace(fund, "another"), table, False), (form, table.replace('"1"', '"2"'), False)]
        for html, rows, valid in cases:
            responses = [io.BytesIO(page.encode()) for page in [html, rows]]
            with self.subTest(valid=valid, html=html, rows=rows), patch("collect_tiger_holdings.urlopen", side_effect=responses):
                if valid:
                    self.assertEqual(collect(fund, day)["rows"], [{"code": "005930", "name": "삼성전자"}])
                else:
                    with self.assertRaises(ValueError):
                        collect(fund, day)
