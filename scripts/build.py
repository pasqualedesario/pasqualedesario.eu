#!/usr/bin/env python3
"""Bundle js/*.js → main.js (classic IIFE) and optionally stamp asset hashes.

Sources (order): utils, i18n, time, carousel, query-surface, index-panel,
app.

Run from repo root:
  python3 scripts/build.py
  python3 scripts/build.py --check
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORDER = (
    "utils.js",
    "i18n.js",
    "time.js",
    "carousel.js",
    "query-surface.js",
    "index-panel.js",
    "app.js",
)
OUT = ROOT / "main.js"
INDEX = ROOT / "index.html"


def strip_module(src: str) -> str:
    out: list[str] = []
    skipping_import = False
    for line in src.splitlines():
        s = line.strip()
        if skipping_import:
            if s.endswith(";") or " from " in s:
                skipping_import = False
            continue
        if s.startswith("import "):
            # Multi-line: import { … } from "…"  or  import( …
            if ("{" in s and "}" not in s) or ("(" in s and ")" not in s):
                skipping_import = True
            continue
        if s.startswith("export "):
            line = line.replace("export ", "", 1)
        out.append(line)
    return "\n".join(out)


def build_bundle() -> str:
    parts: list[str] = []
    for name in ORDER:
        path = ROOT / "js" / name
        if not path.is_file():
            raise FileNotFoundError(f"missing source: {path}")
        parts.append(strip_module(path.read_text()))

    bundle = (
        "/*! Pasquale de Sario — classic bundle from js/*.js */\n"
        "(function () {\n"
        "'use strict';\n\n"
        + "\n\n".join(f"/* === {n} === */\n{p}" for n, p in zip(ORDER, parts))
        + "\n})();\n"
    )

    leftovers = [
        line
        for line in bundle.splitlines()
        if line.lstrip().startswith(("import ", "export "))
    ]
    if leftovers:
        raise RuntimeError(
            "module syntax leaked into bundle:\n" + "\n".join(leftovers[:8])
        )
    return bundle


def short_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def stamp_index(css_hash: str, js_hash: str) -> None:
    html = INDEX.read_text()
    html = re.sub(
        r'href="style\.css(?:\?v=[^"]*)?"',
        f'href="style.css?v={css_hash}"',
        html,
        count=1,
    )
    html = re.sub(
        r'src="main\.js(?:\?v=[^"]*)?"',
        f'src="main.js?v={js_hash}"',
        html,
        count=1,
    )
    INDEX.write_text(html)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="exit 1 if main.js is out of date (no write)",
    )
    parser.add_argument(
        "--no-stamp",
        action="store_true",
        help="skip cache-bust query params on index.html",
    )
    args = parser.parse_args()

    bundle = build_bundle()

    if args.check:
        current = OUT.read_text() if OUT.is_file() else ""
        if current != bundle:
            print("main.js is out of date — run: python3 scripts/build.py", file=sys.stderr)
            return 1
        print("main.js up to date")
        return 0

    OUT.write_text(bundle)
    print(f"main.js → {len(bundle):,} bytes")

    if not args.no_stamp:
        css = ROOT / "style.css"
        stamp_index(short_hash(css), short_hash(OUT))
        print("index.html cache-bust stamped")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
