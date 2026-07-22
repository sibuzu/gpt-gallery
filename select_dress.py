#!/usr/bin/env python3
from __future__ import annotations

import random
import subprocess
import sys
import termios
import tty
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DRESS_DIR = ROOT / "images" / "Dress"


def copy_to_clipboard(text: str) -> None:
    subprocess.run(["pbcopy"], input=text, text=True, check=True)


def wait_key() -> None:
    if not sys.stdin.isatty():
        input()
        return

    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    try:
        tty.setcbreak(fd)
        key = sys.stdin.read(1)
        if key == "\x03":
            raise KeyboardInterrupt
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)


def dress_files() -> list[Path]:
    sanitize_dress_filenames()
    files = sorted(path for path in DRESS_DIR.glob("*.md") if path.is_file())
    if not files:
        raise FileNotFoundError(f"No .md files found in {DRESS_DIR}")
    return files


def clean_text(text: str) -> str:
    return "".join(char for char in text if char.isprintable())


def sanitize_dress_filenames() -> None:
    for path in sorted(DRESS_DIR.iterdir(), key=lambda item: item.name):
        clean_name = clean_text(path.name)
        if clean_name == path.name:
            continue

        target = path.with_name(clean_name)
        if target.exists():
            print(f"Skip rename: {path.name!r} -> {clean_name!r} already exists", file=sys.stderr)
            continue

        path.rename(target)
        print(f"Renamed: {path.name!r} -> {clean_name!r}", file=sys.stderr)


def next_available_name(basename: str) -> str:
    index = 1
    while (DRESS_DIR / f"{basename}-{index}.png").exists():
        index += 1
    return f"{basename}-{index}"


def main() -> None:
    files = dress_files()
    queue: list[Path] = []

    try:
        while True:
            if not queue:
                queue = files.copy()
                random.shuffle(queue)

            path = queue.pop()
            basename = clean_text(path.stem)
            fname = next_available_name(basename)
            content = path.read_text(encoding="utf-8")

            print(f"read {fname}", flush=True)
            copy_to_clipboard(content)

            wait_key()
            copy_to_clipboard(fname)
            print(f"copy {fname}", flush=True)

            wait_key()
    except KeyboardInterrupt:
        print()


if __name__ == "__main__":
    main()
