import json
import sys
import tempfile
import unittest
from datetime import date
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "market"))
from nport_to_holdings import holdings_from_report  # noqa: E402
from rank_archive_portfolio import (  # noqa: E402
    SPLIT_CHECKS, archive_symbol, boundary_prices, load_closes, parse_series, trading_days, verify_split_adjustment,
)
from rank_wiki_portfolio import portfolio_at_start  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
STOOQ_HEADER = "<TICKER>,<PER>,<DATE>,<TIME>,<OPEN>,<HIGH>,<LOW>,<CLOSE>,<VOL>,<OPENINT>\n"


def stooq_rows(symbol, closes):
    return STOOQ_HEADER + "".join(f"{symbol}.US,D,{day.replace('-', '')},000000,1,1,1,{close},100,0\n" for day, close in closes)


class ArchiveParsingTest(unittest.TestCase):
    def test_maps_stooq_file_names_and_tickers_to_symbols(self):
        for name in ("data/daily/us/nasdaq stocks/1/aapl.us.txt", "AAPL.US", "aapl_us_d.csv", "aapl.csv"):
            self.assertEqual(archive_symbol(name), "AAPL")
        self.assertEqual(archive_symbol("brk-b.us.txt"), "BRK-B")

    def test_parses_both_stooq_bulk_rows_and_per_symbol_csv(self):
        bulk = list(parse_series(stooq_rows("AAPL", [("2020-08-28", "124.81")]), "aapl.us.txt"))
        self.assertEqual(bulk, [("AAPL", "2020-08-28", "124.81")])
        simple = list(parse_series("Date,Open,High,Low,Close,Volume\n2020-08-28,1,1,1,124.81,5\n", "aapl_us_d.csv"))
        self.assertEqual(simple, [("AAPL", "2020-08-28", "124.81")])
        with self.assertRaises(ValueError):
            list(parse_series("symbol,price\nAAPL,1\n", "other.csv"))

    def test_loads_only_requested_symbols_and_days_from_a_folder(self):
        with tempfile.TemporaryDirectory() as folder:
            Path(folder, "aapl.us.txt").write_text(stooq_rows("AAPL", [("2024-03-01", "179.66"), ("2024-03-28", "171.48")]), encoding="utf-8")
            Path(folder, "msft.us.txt").write_text(stooq_rows("MSFT", [("2024-03-01", "415.50")]), encoding="utf-8")
            Path(folder, "tsla.us.txt").write_text(stooq_rows("TSLA", [("2024-03-01", "202.64")]), encoding="utf-8")
            closes = load_closes(Path(folder), {"AAPL", "MSFT"}, {"2024-03-01", "2024-03-28"})
        self.assertEqual(closes, {"AAPL": {"2024-03-01": Decimal("179.66"), "2024-03-28": Decimal("171.48")},
                                  "MSFT": {"2024-03-01": Decimal("415.50")}})
        self.assertEqual(trading_days(closes, "2024-03-01", "2024-03-28"), {"2024-03-01", "2024-03-28"})

    def test_rejects_archives_that_are_not_split_adjusted(self):
        adjusted = {symbol: {day: Decimal(value)} for symbol, day, value in SPLIT_CHECKS}
        verify_split_adjustment(adjusted)
        unadjusted = {**adjusted, "AAPL": {"2020-08-28": Decimal("499.23")}}
        with self.assertRaises(ValueError):
            verify_split_adjustment(unadjusted)
        with self.assertRaises(ValueError):
            verify_split_adjustment({})

    def test_boundary_prices_follow_same_share_ticker_changes_and_report_gaps(self):
        closes = {"CTRP": {"2019-11-01": Decimal("33.11")}, "TCOM": {"2019-11-29": Decimal("32.00")},
                  "AAPL": {"2019-11-01": Decimal("1"), "2019-11-29": Decimal("2")}, "CELG": {"2019-11-01": Decimal("1")}}
        prices, missing = boundary_prices(closes, {"CTRP", "AAPL", "CELG"}, "2019-11-01", "2019-11-29",
                                          [("CTRP", "TCOM", "2019-11-05")])
        self.assertEqual(prices, {"CTRP": (Decimal("33.11"), Decimal("32.00")), "AAPL": (Decimal("1"), Decimal("2"))})
        self.assertEqual(missing, ["CELG"])


class HoldingsSnapshotTest(unittest.TestCase):
    XML = """<edgarSubmission xmlns="http://www.sec.gov/edgar/nport"><formData><genInfo><regName>Invesco QQQ Trust, Series 1</regName>
<repPdDate>2024-12-31</repPdDate></genInfo><invstOrSecs>
<invstOrSec><name>Apple Inc</name><title>Apple Inc</title><cusip>037833100</cusip><identifiers><isin value="US0378331005"/><ticker value="AAPL"/></identifiers><assetCat>EC</assetCat></invstOrSec>
<invstOrSec><name>Microsoft Corp</name><title>Microsoft Corp</title><cusip>594918104</cusip><identifiers><isin value="US5949181045"/></identifiers><assetCat>EC</assetCat></invstOrSec>
<invstOrSec><name>Cash</name><title>Cash</title><cusip>000000000</cusip><identifiers><isin value="XX0000000000"/></identifiers><assetCat>STIV</assetCat></invstOrSec>
</invstOrSecs></formData></edgarSubmission>"""
    URL = "https://www.sec.gov/Archives/edgar/data/1067839/000175272425039757/primary_doc.xml"

    def test_builds_a_snapshot_with_reported_and_mapped_tickers_only(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder, "primary_doc.xml")
            path.write_text(self.XML, encoding="utf-8")
            with self.assertRaises(ValueError):
                holdings_from_report(path, self.URL, date(2024, 12, 31), minimum=1)
            snapshot = holdings_from_report(path, self.URL, date(2024, 12, 31), {"594918104": "msft"}, minimum=2)
            with self.assertRaises(ValueError):
                holdings_from_report(path, self.URL, date(2024, 9, 30), {"594918104": "MSFT"}, minimum=2)
        self.assertEqual(snapshot["asOf"], "2024-12-31")
        self.assertEqual(snapshot["membership"], "approximate")
        self.assertEqual([member["symbol"] for member in snapshot["members"]], ["AAPL", "MSFT"])
        self.assertEqual(snapshot["members"][1]["cusip"], "594918104")
        members, _, label = portfolio_at_start(snapshot, [], date(2025, 1, 2))
        self.assertEqual(set(members), {"AAPL", "MSFT"})
        self.assertIn("2024-12-31", label)


class RecordedIndexChangesTest(unittest.TestCase):
    def test_2018_and_2019_changes_roll_the_2017_snapshot_forward(self):
        portfolio = json.loads((ROOT / "data/market/qqq-holdings-2017-09.json").read_text(encoding="utf-8"))
        changes = json.loads((ROOT / "data/market/qqq-index-changes.json").read_text(encoding="utf-8"))
        march, _, _ = portfolio_at_start(portfolio, changes, date(2018, 3, 1))
        self.assertNotIn("LILA", march)
        self.assertIn("LVNTA", march)
        self.assertIn("QVCA", march)
        april, _, _ = portfolio_at_start(portfolio, changes, date(2018, 4, 2))
        self.assertNotIn("LVNTA", april)
        self.assertEqual(len(april), 103)
        january, _, _ = portfolio_at_start(portfolio, changes, date(2019, 1, 2))
        self.assertEqual(len(january), 103)
        self.assertTrue({"AMD", "PEP", "NXPI", "XEL"} <= set(january))
        self.assertFalse({"DISH", "CA", "XRAY", "ESRX", "SHPG"} & set(january))
        self.assertNotIn("QRTEA", january)
        self.assertIn("QRTEA", april)
        year_end, _, _ = portfolio_at_start(portfolio, changes, date(2020, 1, 2))
        self.assertEqual(len(year_end), 103)
        self.assertTrue({"EXC", "ANSS", "SPLK"} <= set(year_end))
        self.assertFalse({"CELG", "HAS", "NLOK", "SYMC"} & set(year_end))


if __name__ == "__main__":
    unittest.main()


from download_qqq_filings import holdings_filings, looks_like_filing  # noqa: E402


class FilingIndexTest(unittest.TestCase):
    def test_lists_holdings_reports_in_date_order_with_edgar_urls(self):
        submissions = {"filings": {"recent": {
            "form": ["NPORT-P", "8-K", "N-30B-2", "NPORT-P"],
            "reportDate": ["2024-12-31", "2024-11-01", "2018-09-30", "2017-06-30"],
            "accessionNumber": ["0001752724-25-039757", "0000000000-24-000001", "0001193125-18-355790", "0001752724-17-000001"],
            "primaryDocument": ["xslFormNPORT-P_X01/primary_doc.xml", "a.htm", "d638310dn30b2.htm", "primary_doc.xml"],
        }}}
        rows = holdings_filings(submissions, "2018-01-01")
        self.assertEqual([row[0] for row in rows], ["2018-09-30", "2024-12-31"])
        self.assertEqual(rows[1][1], "https://www.sec.gov/Archives/edgar/data/1067839/000175272425039757/primary_doc.xml")
        self.assertEqual(rows[0][2], "qqq-2018-09-30-d638310dn30b2.htm")
        self.assertTrue(looks_like_filing(b'<?xml version="1.0"?><edgarSubmission/>', "primary_doc.xml"))
        self.assertFalse(looks_like_filing(b"<html><title>Your Request Originates from an Undeclared Automated Tool</title>", "primary_doc.xml"))
        self.assertFalse(looks_like_filing(b"<html><title>Your Request Originates from an Undeclared Automated Tool</title>", "d.htm"))
