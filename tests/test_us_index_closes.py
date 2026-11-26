import sys
import unittest
from datetime import date
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "market"))
from verify_us_index_closes import compare, fred_boundaries, parse_observations

CSV = """observation_date,SP500,NASDAQCOM
2021-01-04,3700.65,12698.450
2021-01-05,3726.86,12818.960
2021-01-18,,
2021-01-29,3714.24,13070.690
2021-02-01,3773.86,13403.390
2021-02-26,,13192.350
2021-03-01,3901.82,13588.830
2021-03-02,3870.29,13358.790
"""


class VerifyUsIndexClosesTest(unittest.TestCase):
    def setUp(self):
        self.observations = parse_observations(CSV)

    def test_parse_skips_holidays_and_keeps_partial_rows(self):
        self.assertNotIn(date(2021, 1, 18), self.observations)
        self.assertEqual(self.observations[date(2021, 2, 26)], {"NASDAQCOM": Decimal("13192.350")})
        self.assertEqual(self.observations[date(2021, 1, 4)]["SP500"], Decimal("3700.65"))

    def test_boundaries_require_both_series_and_a_finished_month(self):
        boundaries = fred_boundaries(self.observations, date(2021, 3, 2))
        self.assertEqual(boundaries["2021-01"], (date(2021, 1, 4), date(2021, 1, 29)))
        self.assertNotIn("2021-02", boundaries)  # last day lacks the S&P 500 value
        self.assertNotIn("2021-03", boundaries)  # month not finished by the cutoff

    def test_compare_reports_dates_values_and_missing_months(self):
        published = {
            "2021-01": {"firstDate": "2021-01-05", "lastDate": "2021-01-29", "first": [3726.86, 12818.96], "last": [3714.24, 13070.86]},
        }
        findings, missing = compare(published, self.observations, date(2021, 3, 2))
        kinds = {(finding["period"], finding["edge"], finding["kind"]) for finding in findings}
        self.assertEqual(kinds, {("2021-01", "first", "date"), ("2021-01", "last", "value")})
        value = next(finding for finding in findings if finding["kind"] == "value")
        self.assertEqual((value["index"], value["difference"]), ("Nasdaq Composite", "-0.17"))
        self.assertEqual(missing, {})
        findings, missing = compare({}, self.observations, date(2021, 3, 2))
        self.assertEqual(findings, [])
        self.assertEqual(missing, {"2021-01": ("2021-01-04", "2021-01-29")})

    def test_rejects_csv_without_both_series(self):
        with self.assertRaises(ValueError):
            parse_observations("observation_date,SP500\n2021-01-04,3700.65\n")


if __name__ == "__main__":
    unittest.main()
