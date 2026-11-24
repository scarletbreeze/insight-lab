"""Build a public metadata index from selected posts in the original Git repository."""

import argparse
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import quote

SOURCE = "https://github.com/scarletbreeze/scarletbreeze.github.io"
REVISION = "a7fe44e528aa9e83a523d75bbd12f6676934a449"
ROOT = Path(__file__).resolve().parents[2]
TOPICS = {
    "2017": re.compile(r"html|css|bootstrap|form|mvc|flex|퓨즈|fuse|rails|부트스트랩", re.I),
    "2018": re.compile(r"자료구조|컴퓨터구조|통신이론|vi.study", re.I),
    "2019": re.compile(r"운영체제와-정보보호|blockchain|데이터베이스|자료구조", re.I),
}
LIMITS = {"2017": 13, "2018": 12, "2019": 12}


def git(repository, *args):
    return subprocess.check_output(["git", "-C", repository, *args], text=True)


def metadata(path, markdown):
    frontmatter = markdown.split("---", 2)[1]
    title = re.search(r"^title:\s*(.+)$", frontmatter, re.M)
    date = re.search(r"^date:\s*(\d{4}-\d{2}-\d{2})", frontmatter, re.M)
    tags = re.search(r"^tags:\s*\[(.*)\]$", frontmatter, re.M)
    if not title or not date:
        return None
    slug = Path(path).stem
    return {
        "id": slug,
        "slug": slug,
        "title": title[1].strip().strip('"\''),
        "date": date[1],
        "originalDate": date[1],
        "tags": list(dict.fromkeys(tag.lower() for tag in re.findall(r'"([^"]+)"', tags[1]))) if tags else [],
        "sourceType": "기존 공개 블로그",
        "sourceUrl": SOURCE + "/blob/" + REVISION + "/" + quote(path),
        "contentType": "original",
        "relatedProjects": [],
        "visibility": "public",
        "lastUpdated": "2026-11-24",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repository", help="Local checkout of the public legacy repository")
    arguments = parser.parse_args()
    notes = []
    for year, pattern in TOPICS.items():
        files = git(arguments.repository, "ls-tree", "-rz", "--name-only", REVISION, f"content/archive/{year}").split("\0")
        selected = [path for path in files if path.endswith(".md") and pattern.search(Path(path).stem)]
        records = [metadata(path, git(arguments.repository, "show", f"{REVISION}:{path}")) for path in selected]
        notes.extend([record for record in records if record][:LIMITS[year]])
    notes.sort(key=lambda note: (note["date"], note["slug"]), reverse=True)
    output = ROOT / "data/archive/notes/index.json"
    output.write_text(json.dumps(notes, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
