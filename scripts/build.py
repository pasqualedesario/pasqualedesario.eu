#!/usr/bin/env python3
"""Bundle js sources → classic IIFE scripts and stamp cache-bust hashes.

Bundles:
  main.js   ← utils, i18n, time, carousel, query-surface, index-panel, app
  error.js  ← utils, time, error-page

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

BUNDLES = (
    {
        "out": ROOT / "main.js",
        "order": (
            "utils.js",
            "i18n.js",
            "time.js",
            "carousel.js",
            "query-surface.js",
            "index-panel.js",
            "app.js",
        ),
        "html": ROOT / "index.html",
        "script": "main.js",
    },
    {
        "out": ROOT / "error.js",
        "order": ("utils.js", "time.js", "error-page.js"),
        "html": ROOT / "404.html",
        "script": "error.js",
    },
)


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
            if ("{" in s and "}" not in s) or ("(" in s and ")" not in s):
                skipping_import = True
            continue
        if s.startswith("export "):
            line = line.replace("export ", "", 1)
        out.append(line)
    return "\n".join(out)


def build_bundle(order: tuple[str, ...], label: str) -> str:
    parts: list[str] = []
    for name in order:
        path = ROOT / "js" / name
        if not path.is_file():
            raise FileNotFoundError(f"missing source: {path}")
        parts.append(strip_module(path.read_text()))

    bundle = (
        f"/*! Pasquale de Sario — {label} from js/*.js */\n"
        "(function () {\n"
        "'use strict';\n\n"
        + "\n\n".join(f"/* === {n} === */\n{p}" for n, p in zip(order, parts))
        + "\n})();\n"
    )
    # Collapse runs of blank lines left by stripped imports / exports.
    bundle = re.sub(r"\n{3,}", "\n\n", bundle)

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


def stamp_html(path: Path, *, css_hash: str, script: str, js_hash: str) -> None:
    if not path.is_file():
        return
    html = path.read_text()
    html = re.sub(
        r'href="style\.css(?:\?v=[^"]*)?"',
        f'href="style.css?v={css_hash}"',
        html,
        count=1,
    )
    html = re.sub(
        rf'src="{re.escape(script)}(?:\?v=[^"]*)?"',
        f'src="{script}?v={js_hash}"',
        html,
        count=1,
    )
    path.write_text(html)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="exit 1 if any bundle is out of date (no write)",
    )
    parser.add_argument(
        "--no-stamp",
        action="store_true",
        help="skip cache-bust query params on HTML",
    )
    args = parser.parse_args()

    built: list[tuple[dict, str]] = []
    for spec in BUNDLES:
        label = spec["out"].name
        bundle = build_bundle(spec["order"], label)
        built.append((spec, bundle))

    if args.check:
        stale = False
        for spec, bundle in built:
            current = spec["out"].read_text() if spec["out"].is_file() else ""
            if current != bundle:
                print(
                    f"{spec['out'].name} is out of date — run: python3 scripts/build.py",
                    file=sys.stderr,
                )
                stale = True
        if stale:
            return 1
        print("bundles up to date")
        return 0

    for spec, bundle in built:
        spec["out"].write_text(bundle)
        print(f"{spec['out'].name} → {len(bundle):,} bytes")

    if not args.no_stamp:
        css_hash = short_hash(ROOT / "style.css")
        for spec, _ in built:
            stamp_html(
                spec["html"],
                css_hash=css_hash,
                script=spec["script"],
                js_hash=short_hash(spec["out"]),
            )
            print(f"{spec['html'].name} cache-bust stamped")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
