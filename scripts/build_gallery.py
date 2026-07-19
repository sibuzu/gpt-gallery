#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
IMAGES_DIR = ROOT / "images"
INDEX_HTML = ROOT / "index.html"
REPORT_JSON = ROOT / "todo" / "catalog_report.json"
START = "    // GALLERY_DATA_START\n"
END = "    // GALLERY_DATA_END\n"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
SKIP_DIRS = {"all"}


def digest(path: Path) -> str:
    hash_value = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            hash_value.update(chunk)
    return hash_value.hexdigest()


def title_for(path: Path) -> str:
    return path.stem.removeprefix("ChatGPT Image ").strip()


def scan_images() -> tuple[list[dict[str, str]], dict[str, object]]:
    items: list[dict[str, str]] = []
    skipped: list[dict[str, str]] = []
    seen: dict[str, str] = {}

    category_dirs = sorted(
        [path for path in IMAGES_DIR.iterdir() if path.is_dir() and path.name not in SKIP_DIRS],
        key=lambda path: path.name,
    )

    for category_dir in category_dirs:
        files = sorted(
            [path for path in category_dir.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS],
            key=lambda path: path.name,
        )

        for path in files:
            hash_value = digest(path)
            relative_path = path.relative_to(ROOT).as_posix()
            if hash_value in seen:
                skipped.append({
                    "path": relative_path,
                    "duplicate_of": seen[hash_value],
                    "reason": "duplicate_hash",
                })
                continue

            seen[hash_value] = relative_path
            items.append({
                "category": category_dir.name,
                "src": relative_path,
                "title": title_for(path),
            })

    category_counts: dict[str, int] = {}
    for item in items:
        category_counts[item["category"]] = category_counts.get(item["category"], 0) + 1

    report = {
        "total_categorized": len(items),
        "category_counts": category_counts,
        "skipped": skipped,
    }
    return items, report


def render_data_block(items: list[dict[str, str]]) -> str:
    data = json.dumps(items, ensure_ascii=False, indent=6)
    first, *rest = data.splitlines()
    indented_rest = "\n".join(("    " + line) if line else line for line in rest)
    return f"{START}    const images = {first}\n{indented_rest};\n{END}"


def replace_gallery_data(html: str, data_block: str) -> str:
    if START in html and END in html:
        before, rest = html.split(START, 1)
        _, after = rest.split(END, 1)
        return before + data_block + after

    marker = "    const grid = document.querySelector(\"#grid\");"
    before, after = html.split(marker, 1)
    return before.split("    const images = [", 1)[0] + data_block + "\n\n" + marker + after


def main() -> None:
    items, report = scan_images()
    html = INDEX_HTML.read_text(encoding="utf-8")
    INDEX_HTML.write_text(replace_gallery_data(html, render_data_block(items)), encoding="utf-8")
    REPORT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {INDEX_HTML.relative_to(ROOT)} with {len(items)} images.")
    print(f"Updated {REPORT_JSON.relative_to(ROOT)}.")


if __name__ == "__main__":
    main()
