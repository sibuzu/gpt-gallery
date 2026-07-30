#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import random
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
IMAGES_DIR = ROOT / "images"
GALLERY_DATA_JS = ROOT / "scripts" / "gallery-data.js"
REPORT_JSON = ROOT / "todo" / "catalog_report.json"
INDEX_HTML = ROOT / "index.html"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
RENAME_EXTENSIONS = IMAGE_EXTENSIONS | {".md"}
SKIP_DIRS = {"all"}
BUILT_ASSETS = [
    "styles/gallery.css",
    "scripts/gallery-data.js",
    "scripts/gallery.js",
]
CHATGPT_IMAGE_PATTERN = re.compile(
    r"^ChatGPT Image (\d{4})年(\d{1,2})月(\d{1,2})日 (上午|下午)(\d{1,2})_(\d{2})_(\d{2})(?: \((\d+)\))?$"
)
COPY_SUFFIX_PATTERN = re.compile(r"^(.*)-(\d+)$")
NUMBERED_STEM_PATTERN = re.compile(r"^(.+?)(\d+)([A-Za-z]?)(-\d+)?$")
DATE_STEM_PATTERN = re.compile(r"^img-\d{8}-\d{6}(?:-\d+)?$")
OLD_GROUPED_STEM_PATTERN = re.compile(r"^(.+?)(\d+)([a-z]?)(?:-(\d+))?$", re.IGNORECASE)
NEW_GROUPED_STEM_PATTERN = re.compile(r"^(.+[a-z])(\d+)$")


def number_to_letters(number: int) -> str:
    letters = ""
    while number > 0:
        number -= 1
        letters = chr(ord("a") + (number % 26)) + letters
        number //= 26
    return letters


def category_dirs() -> list[Path]:
    return sorted(
        [path for path in IMAGES_DIR.iterdir() if path.is_dir() and path.name not in SKIP_DIRS],
        key=lambda path: path.name,
    )


def convert_chatgpt_filename(path: Path) -> str | None:
    match = CHATGPT_IMAGE_PATTERN.match(path.name.removesuffix(path.suffix))
    if not match:
        return None

    year, month, day, period, hour_text, minute, second, copy_number = match.groups()
    hour = int(hour_text)
    if period == "下午":
        hour = 12 if hour == 12 else hour + 12
    elif period == "上午" and hour == 12:
        hour = 0

    normalized_hour = f"{hour:02d}"
    return (
        f"img-{int(year):04d}{int(month):02d}{int(day):02d}-"
        f"{normalized_hour}{minute}{second}"
        f"{f'-{copy_number}' if copy_number else ''}"
        f"{path.suffix.lower()}"
    )


def rename_special_filenames() -> int:
    renamed = 0
    for path in sorted(IMAGES_DIR.rglob("*"), key=lambda item: str(item)):
        if not path.is_file():
            continue
        if path.suffix.lower() not in RENAME_EXTENSIONS:
            continue

        new_name = convert_chatgpt_filename(path)
        if new_name is None:
            continue
        if new_name == path.name:
            continue

        target = path.with_name(new_name)
        if target.exists():
            continue

        path.rename(target)
        renamed += 1

    return renamed


def normalize_zero_variant_filenames() -> int:
    renamed = 0

    for category_dir in category_dirs():
        files = sorted([path for path in category_dir.iterdir() if path.is_file()], key=lambda path: path.name)
        stems = {path.stem for path in files}
        minus_one_bases = {
            match.group(1)
            for path in files
            if (match := COPY_SUFFIX_PATTERN.match(path.stem)) and match.group(2) == "1"
        }

        for base in sorted(minus_one_bases):
            for source in sorted(category_dir.glob(f"{base}.*"), key=lambda path: path.name):
                if not source.is_file() or source.stem != base:
                    continue

                target = source.with_name(f"{base}-0{source.suffix}")
                if target.exists():
                    continue

                source.rename(target)
                stems.discard(base)
                stems.add(f"{base}-0")
                renamed += 1

        files = sorted([path for path in category_dir.iterdir() if path.is_file()], key=lambda path: path.name)
        stems = {path.stem for path in files}
        minus_one_bases = {
            match.group(1)
            for path in files
            if (match := COPY_SUFFIX_PATTERN.match(path.stem)) and match.group(2) == "1"
        }
        minus_zero_bases = {
            match.group(1)
            for path in files
            if (match := COPY_SUFFIX_PATTERN.match(path.stem)) and match.group(2) == "0"
        }

        for base in sorted(minus_zero_bases - minus_one_bases):
            if base in stems:
                continue

            for source in sorted(category_dir.glob(f"{base}-0.*"), key=lambda path: path.name):
                if not source.is_file() or source.stem != f"{base}-0":
                    continue

                target = source.with_name(f"{base}{source.suffix}")
                if target.exists():
                    continue

                source.rename(target)
                renamed += 1

    return renamed


def grouped_filename_key(stem: str) -> tuple[str, int, str, int] | None:
    if stem == "template" or DATE_STEM_PATTERN.match(stem) or NEW_GROUPED_STEM_PATTERN.match(stem):
        return None

    match = OLD_GROUPED_STEM_PATTERN.match(stem)
    if not match:
        return None

    prefix, number_text, letter, copy_text = match.groups()
    if prefix[-1:].isascii() and prefix[-1:].isalpha():
        return None

    return (prefix, int(number_text), letter.lower(), int(copy_text or 0))


def grouped_filename_sort_key(path: Path) -> tuple[int, int, str]:
    key = grouped_filename_key(path.stem)
    if key is None:
        return (10_000, 10_000, path.name)

    _prefix, _number, letter, copy_number = key
    letter_order = 0 if not letter else ord(letter) - ord("a") + 1
    return (letter_order, copy_number, path.name)


def normalize_grouped_filenames() -> int:
    renamed = 0

    for category_dir in category_dirs():
        groups: dict[tuple[str, int], list[Path]] = {}
        for path in sorted(category_dir.iterdir(), key=lambda path: path.name):
            if not path.is_file() or path.suffix.lower() not in RENAME_EXTENSIONS:
                continue

            key = grouped_filename_key(path.stem)
            if key is None:
                continue

            prefix, number, _letter, _copy_number = key
            groups.setdefault((prefix, number), []).append(path)

        planned: dict[Path, Path] = {}
        for (prefix, number), paths in sorted(groups.items()):
            sequence_stems: dict[str, str] = {}
            stems = sorted({path.stem for path in paths}, key=lambda stem: grouped_filename_sort_key(paths[0].with_name(f"{stem}{paths[0].suffix}")))
            width = 2 if len(stems) >= 10 else 1

            for index, stem in enumerate(stems, start=1):
                sequence = f"{index:0{width}d}"
                sequence_stems[stem] = f"{prefix}{number_to_letters(number)}{sequence}"

            for path in paths:
                new_stem = sequence_stems[path.stem]
                if new_stem == path.stem:
                    continue
                planned[path] = path.with_name(f"{new_stem}{path.suffix}")

        if not planned:
            continue

        targets = list(planned.values())
        duplicate_targets = {target for target in targets if targets.count(target) > 1}
        existing_targets = {target for target in targets if target.exists() and target not in planned}
        if duplicate_targets or existing_targets:
            blocked = sorted(duplicate_targets | existing_targets, key=lambda path: str(path))
            names = ", ".join(path.relative_to(ROOT).as_posix() for path in blocked[:5])
            raise RuntimeError(f"Grouped rename target collision in {category_dir.relative_to(ROOT)}: {names}")

        temp_paths: dict[Path, Path] = {}
        for index, source in enumerate(sorted(planned, key=lambda path: path.name), start=1):
            temp = source.with_name(f".rename-{index}-{source.name}")
            while temp.exists():
                index += 1
                temp = source.with_name(f".rename-{index}-{source.name}")
            source.rename(temp)
            temp_paths[temp] = planned[source]

        for temp, target in temp_paths.items():
            temp.rename(target)
            renamed += 1

    return renamed


def normalize_number_padding() -> int:
    renamed = 0

    for category_dir in category_dirs():
        files = sorted(
            [
                path
                for path in category_dir.iterdir()
                if path.is_file() and path.suffix.lower() in RENAME_EXTENSIONS
            ],
            key=lambda path: path.name,
        )
        parsed: list[tuple[Path, str, str, str, str]] = []
        max_numbers: dict[str, int] = {}

        for path in files:
            match = NUMBERED_STEM_PATTERN.match(path.stem)
            if not match:
                continue

            prefix, number_text, letter, copy_suffix = match.groups()
            parsed.append((path, prefix, number_text, letter, copy_suffix or ""))
            max_numbers[prefix] = max(max_numbers.get(prefix, 0), int(number_text))

        for path, prefix, number_text, letter, copy_suffix in parsed:
            number = int(number_text)
            if max_numbers[prefix] < 10 or number >= 10 or len(number_text) >= 2:
                continue

            target = path.with_name(f"{prefix}{number:02d}{letter}{copy_suffix}{path.suffix}")
            if target.exists():
                continue

            path.rename(target)
            renamed += 1

    return renamed


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

    for category_dir in category_dirs():
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
                "hasDescription": path.with_suffix(".md").exists(),
                "title": title_for(path),
            })

    random.shuffle(items)

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
    data = json.dumps(items, ensure_ascii=False, indent=2)
    return f"window.__GALLERY_IMAGES__ = {data};\n"


def update_asset_cache_bust(index_path: Path, version: str) -> bool:
    html = index_path.read_text(encoding="utf-8")
    original = html

    for asset in BUILT_ASSETS:
        pattern = re.compile(rf"((?:src|href)=\")({re.escape(asset)})(?:\\?[^\"']*)?(\")")
        html = pattern.sub(lambda match: f'{match.group(1)}{match.group(2)}?v={version}{match.group(3)}', html)

    if html == original:
        return False

    index_path.write_text(html, encoding="utf-8")
    return True


def main() -> None:
    renamed = rename_special_filenames()
    normalized = normalize_zero_variant_filenames()
    regrouped = normalize_grouped_filenames()
    padded = normalize_number_padding()
    items, report = scan_images()
    GALLERY_DATA_JS.write_text(render_data_block(items), encoding="utf-8")
    REPORT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    version = int(time.time())
    updated = update_asset_cache_bust(INDEX_HTML, str(version))

    if renamed:
        print(f"Renamed {renamed} file(s).")
    if normalized:
        print(f"Normalized {normalized} grouped filename(s).")
    if regrouped:
        print(f"Regrouped {regrouped} filename(s).")
    if padded:
        print(f"Zero-padded {padded} numbered filename(s).")
    print(f"Updated {GALLERY_DATA_JS.relative_to(ROOT)} with {len(items)} images.")
    print(f"Updated {REPORT_JSON.relative_to(ROOT)}.")
    if updated:
        print(f"Updated {INDEX_HTML.relative_to(ROOT)} cache-buster to v={version}.")


if __name__ == "__main__":
    main()
