#!/usr/bin/env python3
"""Convert all internal TechMonx links from *.html paths to clean paths
(no .html extension, index.html -> /). Only touches href= attributes and
JSON-LD url/item fields that point at internal pages, plus sitemap.xml.
Leaves assets (css/js/images/fonts/svg/xml/json/favicon), external links,
mailto:, tel:, and the contact-handler.php form action untouched."""
import re
from pathlib import Path

ROOT = Path(__file__).parent

PAGES = [
    "about", "blog-ai-facebloom-lessons", "blog-blockchain-smart-contracts",
    "blog-devops-cicd-checklist", "blog-unity-game-development", "blog",
    "careers", "contact", "cookie-policy", "portfolio",
    "privacy-policy", "project-bibo", "project-buff-dudes",
    "project-calling-all-kids", "project-church-service-hub",
    "project-facebloom", "project-fitcoin", "project-forun",
    "services", "terms-of-service", "testimonials",
]

HTML_FILES = [p + ".html" for p in PAGES] + ["index.html"]

REPLACEMENTS = {}

# 1) href="page.html" / href="page.html#anchor" -> href="/page" / href="/page#anchor"
for p in PAGES:
    REPLACEMENTS[f'href="{p}.html"'] = f'href="/{p}"'
    REPLACEMENTS[f'href="{p}.html#'] = f'href="/{p}#'
    # absolute canonical-style
    REPLACEMENTS[f'href="https://techmonx.co.uk/{p}.html"'] = f'href="https://techmonx.co.uk/{p}"'
    REPLACEMENTS[f'href="https://techmonx.co.uk/{p}.html#'] = f'href="https://techmonx.co.uk/{p}#'
    # JSON-LD "item"/"url" fields
    REPLACEMENTS[f'"https://techmonx.co.uk/{p}.html"'] = f'"https://techmonx.co.uk/{p}"'
    REPLACEMENTS[f'"https://techmonx.co.uk/{p}.html#'] = f'"https://techmonx.co.uk/{p}#'
    # sitemap.xml <loc>
    REPLACEMENTS[f'<loc>https://techmonx.co.uk/{p}.html</loc>'] = f'<loc>https://techmonx.co.uk/{p}</loc>'

# 2) index.html special-cases -> root
REPLACEMENTS['href="index.html"'] = 'href="/"'
REPLACEMENTS['href="https://techmonx.co.uk/index.html"'] = 'href="https://techmonx.co.uk/"'
REPLACEMENTS['"https://techmonx.co.uk/index.html"'] = '"https://techmonx.co.uk/"'
REPLACEMENTS['<loc>https://techmonx.co.uk/index.html</loc>'] = '<loc>https://techmonx.co.uk/</loc>'

# Sort longest-first so "page.html#" patterns are tried before the bare
# "page.html" pattern would otherwise short-circuit (not strictly needed
# since keys differ, but keeps behaviour predictable).
ORDERED_KEYS = sorted(REPLACEMENTS.keys(), key=len, reverse=True)


def process(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    original = text
    count = 0
    for key in ORDERED_KEYS:
        n = text.count(key)
        if n:
            text = text.replace(key, REPLACEMENTS[key])
            count += n
    if text != original:
        path.write_text(text, encoding="utf-8")
    return count


def main():
    total = 0
    for name in HTML_FILES:
        p = ROOT / name
        if not p.exists():
            print(f"SKIP (missing): {name}")
            continue
        n = process(p)
        total += n
        print(f"{name}: {n} replacements")

    sm = ROOT / "sitemap.xml"
    if sm.exists():
        n = process(sm)
        total += n
        print(f"sitemap.xml: {n} replacements")

    print(f"\nTotal replacements: {total}")


if __name__ == "__main__":
    main()
