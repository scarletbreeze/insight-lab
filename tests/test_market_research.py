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


from classify_exclusions import (  # noqa: E402
    REASON_BREAK, REASON_SHARES, REASON_VOLUME, STATUS_PARTIAL, STATUS_UNRESOLVED, categorize, match_actions,
    parse_kind_pages, status_for,
)


def _event(name, day, before, after):
    return {"name": name, "shareChanges": [{"date": day, "before": before, "after": after}], "zeroVolumeDays": [], "priceBreakDays": []}


class ClassifyExclusionsTest(unittest.TestCase):
    def test_parses_kind_rows_and_drops_repeated_pages(self):
        import tempfile
        row = ('<tr><td class="first" title="아이센스"><a href="#">아이센스</a></td><td>2024-11-29</td><td>추가상장</td>'
               '<td>4,000</td><td> 500 </td><td>주식매수선택권행사</td></tr>')
        header = '<tr><th>법인명</th><th>일자</th><th>상장구분</th><th>변동주식수</th><th>액면가</th><th>사유</th></tr>'
        with tempfile.TemporaryDirectory() as folder:
            for name in ("page-1.html", "page-2.html"):
                Path(folder, name).write_text(f"<table>{header}{row}</table>", encoding="utf-8")
            rows = parse_kind_pages(folder)
        self.assertEqual(rows, [{"name": "아이센스", "date": "2024-11-29", "listingType": "추가상장",
                                 "shares": 4000, "par": "500", "reason": "주식매수선택권행사"}])

    def test_matches_same_day_sums_subsets_and_marks_price_rebasing(self):
        kind = [{"name": "셀트리온", "date": "2024-11-13", "listingType": "추가상장", "shares": 3500, "par": "1,000", "reason": "주식매수선택권 행사"},
                {"name": "셀트리온", "date": "2024-11-13", "listingType": "추가상장", "shares": 53864, "par": "1,000", "reason": "주식매수선택권 행사"},
                {"name": "삼성물산", "date": "2024-05-10", "listingType": "변경상장", "shares": -159835, "par": "100", "reason": "감자(주식소각)"},
                {"name": "삼성물산", "date": "2024-05-10", "listingType": "변경상장", "shares": -5918674, "par": "100", "reason": "주식소각"},
                {"name": "삼성물산", "date": "2024-05-10", "listingType": "변경상장", "shares": -1888889, "par": "100", "reason": "감자(주식소각)"},
                {"name": "에코프로", "date": "2024-04-25", "listingType": "추가상장", "shares": 106510672, "par": "100", "reason": "액면분할"},
                {"name": "LG디스플레이", "date": "2024-03-26", "listingType": "추가상장", "shares": 142184300, "par": "5,000", "reason": "유상증자(구주주배정)"}]
        events = {"068270": _event("셀트리온", "2024-11-13", 217021190, 217078554),
                  "028260": _event("삼성물산", "2024-05-10", 100000000, 92192437),
                  "086520": _event("에코프로", "2024-04-26", 26627668, 133138340),
                  "034220": _event("LG디스플레이", "2024-03-26", 357815700, 500000000),
                  "000001": _event("미확인", "2024-05-02", 10, 11)}
        matched = match_actions(events, kind)
        celltrion = matched["068270"]["shareChanges"][0]
        self.assertEqual((celltrion["action"], celltrion["priceRebasing"]), ("주식매수선택권 행사", False))
        self.assertEqual(celltrion["kindName"], "셀트리온")
        samsung = matched["028260"]["shareChanges"][0]
        self.assertEqual((samsung["action"], samsung["kindReason"]), ("주식소각", "감자(주식소각) · 주식소각"))
        split = matched["086520"]["shareChanges"][0]
        self.assertEqual((split["action"], split["priceRebasing"], split["kindDate"]), ("주식분할", True, "2024-04-25"))
        self.assertTrue(matched["034220"]["shareChanges"][0]["priceRebasing"])
        self.assertEqual(matched["000001"]["shareChanges"][0]["action"], STATUS_UNRESOLVED)

    def test_cross_name_rows_need_a_verified_alias(self):
        kind = [{"name": "케이티앤지", "date": "2024-03-11", "listingType": "변경상장", "shares": -3500000, "par": "5,000", "reason": "주식소각"}]
        events = {"033780": _event("KT&G", "2024-03-11", 100000000, 96500000)}
        self.assertEqual(match_actions(events, kind)["033780"]["shareChanges"][0]["action"], STATUS_UNRESOLVED)
        events = {"033780": _event("KT&G", "2024-03-11", 100000000, 96500000)}
        change = match_actions(events, kind, {"033780": ["케이티앤지"]})["033780"]["shareChanges"][0]
        self.assertEqual((change["action"], change["kindName"]), ("주식소각", "케이티앤지"))

    def test_status_counts_only_sourced_explanations(self):
        matched = [{"date": "2024-11-13", "before": 1, "after": 2, "kindReason": "주식매수선택권 행사", "priceRebasing": False}]
        rebasing = [{"date": "2024-08-02", "before": 1, "after": 2, "kindReason": "무상증자", "priceRebasing": True}]
        unmatched = [{"date": "2024-08-13", "before": 1, "after": 2, "action": STATUS_UNRESOLVED}]
        paper = [{"title": "주권매매거래정지", "date": "2024-06-10", "url": "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=1"}]
        self.assertEqual(status_for(REASON_SHARES, matched, [], [], []), "KIND 발행내역 일치 · 기준가 조정 없음")
        self.assertEqual(status_for(REASON_SHARES, rebasing, [], [], []), "KIND 발행내역 일치 · 권리락 조정 필요")
        self.assertEqual(status_for(REASON_SHARES, unmatched, [], [], []), STATUS_UNRESOLVED)
        self.assertEqual(status_for(REASON_SHARES, unmatched, paper, [], []), "DART 공시 확인 · KIND 일부 불일치")
        self.assertEqual(status_for(REASON_VOLUME, [], [], ["2024-12-30"], []), STATUS_UNRESOLVED)
        self.assertEqual(status_for(REASON_VOLUME, [], paper, ["2024-12-30"], []), "거래정지 공시 확인")
        self.assertEqual(status_for(REASON_BREAK, [], [], [], ["2024-12-27"]), STATUS_UNRESOLVED)
        self.assertEqual(status_for(REASON_BREAK, matched, [], [], ["2024-12-27"]), STATUS_PARTIAL)
        self.assertEqual(status_for(REASON_BREAK, rebasing, [], [], ["2024-07-12"]), "권리락 추정 · KIND 상장일 기준(권리락일 미확인)")
        self.assertEqual(status_for(REASON_BREAK, rebasing, [], [], ["2024-12-27"]), STATUS_PARTIAL)

    def test_categorizes_kind_reasons(self):
        for reason, category in [("국내사모 전환사채 전환", "전환사채 전환"), ("국내CB전환", "전환사채 전환"), ("이익소각", "주식소각"),
                                 ("감자(주식소각)", "주식소각"), ("우선주의 보통주전환", "우선주 전환"), ("회사분할(존속)", "회사분할"),
                                 ("유상증자(제3자배정)", "유상증자"), ("국내공모 신주인수권부사채 신주인수권 행사", "신주인수권 행사"), ("상호변경", "기타")]:
            self.assertEqual(categorize(reason), category, reason)
