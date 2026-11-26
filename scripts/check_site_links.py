"""Check internal navigation and search results against the generated Pages site.

Usage: python3 scripts/check_site_links.py [BUILD_DIR]  (default: dist)"""
import json
import os
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "dist")
    if not root.is_dir():
        sys.exit(f"build directory not found: {root}")
    configured = os.environ.get("INSIGHT_LAB_BASE_PATH") or "/insight-lab/"
    base = "/" + configured.strip("/") + "/" if configured.strip("/") else "/"
    pages = {}
    targets = []
    for path in sorted(root.rglob("*.html")):
        relative = path.relative_to(root).as_posix()
        route = base + (relative[:-len("index.html")] if path.name == "index.html" else relative)
        page = Page()
        page.feed(path.read_text(encoding="utf-8"))
        pages[route] = page
        targets.extend((route, link) for link in page.links)

    records = json.loads((root / "search-index.json").read_text(encoding="utf-8"))
    for record in records:
        href = base + record["route"] + "/"
        if record.get("anchor"):
            href += "#" + record["anchor"]
        targets.append((base + "search/", href))

    errors = []
    for origin, href in targets:
        url = urlsplit(urljoin(origin, href))
        if url.scheme or url.netloc:
            continue
        path = unquote(url.path)
        if path in pages:
            if url.fragment and unquote(url.fragment) not in pages[path].ids:
                errors.append((origin, href))
        elif not path.startswith(base) or not (root / path[len(base):]).is_file():
            errors.append((origin, href))
    if errors:
        for origin, href in errors[:30]:
            print(f"{origin} -> {href}", file=sys.stderr)
        raise SystemExit(f"{len(errors)} unresolved internal references")
    print(f"Checked {len(pages)} pages and {len(records)} search results.")


if __name__ == "__main__":
    main()
