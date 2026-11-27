"""List and download the Invesco QQQ Trust holdings filings (N-PORT XML, N-30B-2 HTML) from SEC EDGAR.

The filing index comes from the public submissions API; each primary document is saved once under the output folder
as ``qqq-<report date>-<document name>``. SEC requires a declared User-Agent for automated tools, so pass one with
``--user-agent`` in the documented form ``"Name contact@example.com"``. Existing files are kept, and a response that is
not the filing (for example the SEC's "Undeclared Automated Tool" page) is discarded and reported.
"""

import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

CIK = "0001067839"
SUBMISSIONS = f"https://data.sec.gov/submissions/CIK{CIK}.json"
HOLDINGS_FORMS = {"NPORT-P", "N-30B-2", "N-Q", "N-CSR", "N-CSRS"}


def holdings_filings(submissions, since="2017-09-30"):
    """Return ``[(report_date, filing_url, local_name)]`` for holdings reports dated on or after ``since``."""
    recent = submissions["filings"]["recent"]
    rows = zip(recent["form"], recent["reportDate"], recent["accessionNumber"], recent["primaryDocument"])
    filings = []
    for form, report_date, accession, document in rows:
        if form not in HOLDINGS_FORMS or report_date < since:
            continue
        # EDGAR lists the rendered N-PORT view (xslFormNPORT-P_X01/primary_doc.xml); the raw XML sits beside it.
        document_name = document.rsplit("/", 1)[-1]
        url = f"https://www.sec.gov/Archives/edgar/data/{int(CIK)}/{accession.replace('-', '')}/{document_name}"
        filings.append((report_date, url, f"qqq-{report_date}-{document_name}"))
    return sorted(filings)


def looks_like_filing(body, name):
    head = body[:600].lstrip().lower()
    if name.endswith(".xml"):
        return head.startswith(b"<?xml") or head.startswith(b"<edgarsubmission")
    return b"undeclared automated tool" not in body[:4000].lower() and b"<html" in head


def fetch(url, user_agent):
    request = urllib.request.Request(url, headers={"User-Agent": user_agent, "Accept-Encoding": "identity"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True, help="Folder for the downloaded filings")
    parser.add_argument("--user-agent", required=True, help='Declared tool identity, e.g. "Insight Lab contact@example.com"')
    parser.add_argument("--since", default="2017-09-30", help="Earliest report date to include")
    parser.add_argument("--list-only", action="store_true")
    parser.add_argument("--pause", type=float, default=0.3, help="Seconds between requests (SEC allows at most 10 per second)")
    args = parser.parse_args()
    submissions = json.loads(fetch(SUBMISSIONS, args.user_agent))
    filings = holdings_filings(submissions, args.since)
    for report_date, url, name in filings:
        print(report_date, url)
    if args.list_only:
        return
    args.out.mkdir(parents=True, exist_ok=True)
    failures = []
    for report_date, url, name in filings:
        target = args.out / name
        if target.exists():
            continue
        try:
            body = fetch(url, args.user_agent)
        except Exception as error:  # noqa: BLE001 - report and continue with the next filing
            failures.append(f"{name}: {error}")
            continue
        if not looks_like_filing(body, name):
            failures.append(f"{name}: response is not the filing (blocked or redirected)")
        else:
            target.write_bytes(body)
        time.sleep(args.pause)
    if failures:
        print("\n".join(failures), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
