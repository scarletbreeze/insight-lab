import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "hero"))
from collect_official_directory import collect


class OfficialDirectoryTest(unittest.TestCase):
    def pages(self):
        def menu(group, title):
            return (f'<a href="whlstt1.htm"><img src="../wht_toc2.gif" /> {group}</a>\n'
                    f'&nbsp;&nbsp;&nbsp;<a href="../0123.htm"><img src="../wht_toc3.gif" /> {title}</a>')
        return {
            "whgdata/whlstt0.htm": menu("주식", "[0123] 거래비중"),
            "whgdata/whlstt1.htm": menu("투자정보", "거래 비중 차트 [0123]"),
            "0123.htm": 'addTocInfo("주식\\n종목시세");<h1>[0123] 거래비중차트</h1>',
        }

    def test_same_number_in_two_menus_keeps_title_and_alias(self):
        directory = collect(self.pages().__getitem__)
        self.assertEqual(directory["screens"], [dict(number="0123", title="거래비중차트",
            group="주식", menuTitles=["거래비중"], otherGroups=["투자정보"])])

    def test_number_mismatch_stops_publication(self):
        pages = self.pages()
        pages["0123.htm"] = "<h1>[0124] 다른 화면</h1>"
        with self.assertRaisesRegex(ValueError, "0123"):
            collect(pages.__getitem__)
