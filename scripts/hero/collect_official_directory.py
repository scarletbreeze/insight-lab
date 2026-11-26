"""Index numbered entries in the public Hero4 RoboHelp contents tree."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import html
import json
import re
from datetime import date
from pathlib import Path
from urllib.request import urlopen

BASE = "https://download.kiwoom.com/hero4_help_new/whgdata/"
ENTRY = re.compile(r'href="../(\d{4})\.htm"[^>]*><img[^>]*>\s*([^<]+)')
BRANCH = re.compile(r'wht_toc2.gif"[^>]*>\s*([^<]+)')


def get_page(path):
    with urlopen("https://download.kiwoom.com/hero4_help_new/" + path, timeout=30) as response:
        return response.read().decode("utf-8-sig")


def normalized(text):
    return "".join(ch for ch in text.casefold() if ch.isalnum())


def collect(fetch=get_page):
    pending = {"whlstt0.htm"}
    seen = set()
    records = {}
    while pending:
        name = min(pending)
        pending.remove(name)
        contents = fetch("whgdata/" + name)
        if "wht_toc" not in contents:
            raise ValueError(f"Unrecognized contents page: {name}")
        seen.add(name)
        pending.update(set(re.findall(r'href="(whlstt\d+\.htm)', contents)) - seen)
        branches = {}
        for line in contents.splitlines():
            depth = line.count("&nbsp;") // 3
            branch = BRANCH.search(line)
            if branch:
                branches = {d: label for d, label in branches.items() if d < depth}
                branches[depth] = html.unescape(branch[1]).strip()
            entry = ENTRY.search(line)
            if not entry or depth == 0 or 0 not in branches:
                continue
            number, label = entry.groups()
            marker = f"[{number}]"
            if marker in label:
                title = html.unescape(label).replace(marker, "").strip()
                record = records.setdefault(number, {"titles": set(), "groups": set()})
                record["titles"].add(title)
                record["groups"].add(branches[0])

    def check_heading(number):
        menu = records[number]
        page = fetch(number + ".htm")
        heading = re.search(r"<h1\b[^>]*>(.*?)</h1>", page, re.I | re.S)
        title = html.unescape(re.sub(r"<[^>]+>", "", heading[1])).strip() if heading else ""
        marker = f"[{number}]"
        if marker not in title:
            raise ValueError(f"Check official heading for {number}: {title}")
        title = " ".join(title.replace(marker, "").split())
        groups = sorted(menu["groups"])
        toc = re.search(r'addTocInfo\("([^"]+)', page)
        section = toc[1].split(r"\n")[0] if toc else ""
        primary = section if section in groups else groups[0]
        record = dict(number=number, title=title, group=primary)
        aliases = sorted(t for t in menu["titles"] if normalized(t) != normalized(title))
        if aliases:
            record["menuTitles"] = aliases
        if len(groups) > 1:
            record["otherGroups"] = [group for group in groups if group != primary]
        return record

    with ThreadPoolExecutor(max_workers=4) as workers:
        entries = list(workers.map(check_heading, sorted(records)))
    return dict(retrievedAt=date.today().isoformat(), sourceUrl=BASE + "whlstt0.htm",
                screens=entries)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.write_text(json.dumps(collect(), ensure_ascii=False, indent=2) + "\n")
