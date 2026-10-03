#!/usr/bin/env python3
"""Bundle js sources → classic IIFE scripts and stamp cache-bust hashes.

Bundles:
  main.js   ← utils-shared, utils, i18n, time, carousel, query-surface, index-panel, app
  error.js  ← utils-shared, time, error-page

Also syncs the index.html about early-boot object from js/i18n.js (ABOUT_BOOT).

Run from repo root:
  python3 scripts/build.py
  python3 scripts/build.py --check
  npm run build   # same, after npm install (enables minify)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BUNDLES = (
    {
        "out": ROOT / "main.js",
        "order": (
            "utils-shared.js",
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
        "order": ("utils-shared.js", "time.js", "error-page.js"),
        "html": ROOT / "404.html",
        "script": "error.js",
    },
)

ABOUT_BOOT_RE = re.compile(
    r"/\* === ABOUT_BOOT_START === \*/.*?/\* === ABOUT_BOOT_END === \*/",
    re.DOTALL,
)


def strip_module(src: str) -> str:
    out: list[str] = []
    skipping = False
    for line in src.splitlines():
        s = line.strip()
        if skipping:
            if s.endswith(";") or " from " in s:
                skipping = False
            continue
        if s.startswith("import "):
            if ("{" in s and "}" not in s) or ("(" in s and ")" not in s):
                skipping = True
            continue
        if s.startswith("export "):
            # Drop re-exports (`export { … } from` / multiline `export {`).
            reexport = (
                " from " in s
                or s == "export {"
                or (s.startswith("export {") and "}" not in s)
            )
            if reexport:
                if " from " not in s:
                    skipping = True
                continue
            line = line.replace("export ", "", 1)
        out.append(line)
    return "\n".join(out)


def esbuild_bin() -> Path | None:
    local = ROOT / "node_modules" / ".bin" / "esbuild"
    if local.is_file():
        return local
    which = shutil.which("esbuild")
    return Path(which) if which else None


def minify_js(source: str, label: str) -> str:
    """Minify with esbuild when available; otherwise keep readable IIFE."""
    bin_path = esbuild_bin()
    if not bin_path:
        return source
    try:
        proc = subprocess.run(
            [
                str(bin_path),
                "--minify",
                "--legal-comments=none",
                "--log-level=error",
                f"--sourcefile={label}",
            ],
            input=source,
            text=True,
            capture_output=True,
            check=False,
        )
    except OSError as err:
        print(f"warn: minify skipped ({err})", file=sys.stderr)
        return source
    if proc.returncode != 0:
        print(proc.stderr or "esbuild failed", file=sys.stderr)
        raise RuntimeError(f"minify failed for {label}")
    return proc.stdout


def build_bundle(order: tuple[str, ...], label: str, *, minify: bool) -> str:
    parts: list[str] = []
    for name in order:
        path = ROOT / "js" / name
        if not path.is_file():
            raise FileNotFoundError(f"missing source: {path}")
        # Normalise newlines so --check is stable across editors.
        parts.append(strip_module(path.read_text(encoding="utf-8").replace("\r\n", "\n")))

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
    if minify:
        bundle = minify_js(bundle, label)
    return bundle


def short_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def stamp_html(path: Path, *, css_hash: str, script: str, js_hash: str) -> None:
    if not path.is_file():
        return
    html = path.read_text(encoding="utf-8")
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
    path.write_text(html, encoding="utf-8")


def load_about_boot() -> dict:
    """Read ABOUT_BOOT from i18n via Node (single source of truth)."""
    proc = subprocess.run(
        [
            "node",
            "--input-type=module",
            "-e",
            "import { ABOUT_BOOT } from './js/i18n.js'; "
            "process.stdout.write(JSON.stringify(ABOUT_BOOT))",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            "failed to load ABOUT_BOOT from js/i18n.js:\n" + (proc.stderr or proc.stdout)
        )
    data = json.loads(proc.stdout)
    for lang in ("it", "en"):
        block = data.get(lang) or {}
        for key in ("short", "full", "expand"):
            if not isinstance(block.get(key), str) or not block[key]:
                raise RuntimeError(f"ABOUT_BOOT.{lang}.{key} missing or empty")
    return data


def about_boot_snippet(about: dict) -> str:
    payload = json.dumps(about, ensure_ascii=False, indent=2)
    return (
        "/* === ABOUT_BOOT_START === */\n"
        "          /* Painted before main.js — generated from js/i18n.js ABOUT_BOOT. */\n"
        "          (() => {\n"
        f"            const ABOUT = {payload};\n"
        "            try {\n"
        '              const lang = document.documentElement.lang === "en" ? "en" : "it";\n'
        '              const mobile = matchMedia("(max-width: 999px)").matches;\n'
        "              const t = ABOUT[lang];\n"
        '              const start = document.getElementById("intro-text-start");\n'
        '              const expand = document.getElementById("intro-expand");\n'
        "              if (start) start.textContent = mobile ? t.short : t.full;\n"
        "              if (expand && mobile) {\n"
        "                expand.hidden = false;\n"
        "                expand.textContent = t.expand;\n"
        "              }\n"
        "            } catch {\n"
        "              /* ignore */\n"
        "            }\n"
        "          })();\n"
        "          /* === ABOUT_BOOT_END === */"
    )


def sync_about_boot(html: str, about: dict) -> str:
    snippet = about_boot_snippet(about)
    if not ABOUT_BOOT_RE.search(html):
        raise RuntimeError("index.html missing ABOUT_BOOT_START/END markers")
    return ABOUT_BOOT_RE.sub(snippet, html)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="exit 1 if any bundle or about-boot is out of date (no write)",
    )
    parser.add_argument(
        "--no-stamp",
        action="store_true",
        help="skip cache-bust query params on HTML",
    )
    parser.add_argument(
        "--no-minify",
        action="store_true",
        help="skip esbuild minify even when available",
    )
    args = parser.parse_args()

    minify = not args.no_minify and esbuild_bin() is not None
    if not args.no_minify and not minify:
        print(
            "note: esbuild not found — bundles unminified (npm install for minify)",
            file=sys.stderr,
        )

    about = load_about_boot()
    index_html = ROOT / "index.html"
    index_src = index_html.read_text(encoding="utf-8")
    index_synced = sync_about_boot(index_src, about)

    built: list[tuple[dict, str]] = []
    for spec in BUNDLES:
        label = spec["out"].name
        bundle = build_bundle(spec["order"], label, minify=minify)
        built.append((spec, bundle))

    if args.check:
        stale = False
        if index_src != index_synced:
            print(
                "index.html about-boot is out of date — run: python3 scripts/build.py",
                file=sys.stderr,
            )
            stale = True
        for spec, bundle in built:
            current = (
                spec["out"].read_text(encoding="utf-8") if spec["out"].is_file() else ""
            )
            if current != bundle:
                print(
                    f"{spec['out'].name} is out of date — run: python3 scripts/build.py",
                    file=sys.stderr,
                )
                stale = True
        if stale:
            return 1
        print("bundles up to date" + (" (minified)" if minify else ""))
        return 0

    if index_src != index_synced:
        index_html.write_text(index_synced, encoding="utf-8")
        print("index.html about-boot synced from i18n.js")

    for spec, bundle in built:
        spec["out"].write_text(bundle, encoding="utf-8")
        print(f"{spec['out'].name} → {len(bundle):,} bytes" + (" minified" if minify else ""))

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
