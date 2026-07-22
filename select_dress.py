#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import random
import subprocess
import sys
import termios
import tty
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DRESS_DIR = ROOT / "images" / "Dress"
DRESS_OUTPUT_DIR = ROOT / "images" / "Dress-1"
STATE_PATH = ROOT / ".select_dress_state.json"


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
    DRESS_OUTPUT_DIR.mkdir(exist_ok=True)
    sanitize_directory(DRESS_DIR)
    sanitize_directory(DRESS_OUTPUT_DIR)
    files = sorted(path for path in DRESS_DIR.glob("*.md") if path.is_file())
    if not files:
        raise FileNotFoundError(f"No .md files found in {DRESS_DIR}")
    return files


def clean_text(text: str) -> str:
    return "".join(char for char in text if char.isprintable())


def sanitize_directory(directory: Path) -> None:
    for path in sorted(directory.iterdir(), key=lambda item: item.name):
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
    while (DRESS_OUTPUT_DIR / f"{basename}-{index}.png").exists():
        index += 1
    return f"{basename}-{index}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--clear", action="store_true", help="clear progress and start a new shuffle")
    return parser.parse_args()


def file_map(files: list[Path]) -> dict[str, Path]:
    return {clean_text(path.stem): path for path in files}


def load_state(files: list[Path], clear: bool) -> dict[str, list[str]]:
    basenames = list(file_map(files))
    if clear or not STATE_PATH.exists():
        state: dict[str, list[str]] = {"completed": [], "order": basenames.copy()}
        random.shuffle(state["order"])
        save_state(state)
        return state

    with STATE_PATH.open(encoding="utf-8") as state_file:
        state = json.load(state_file)

    completed = [name for name in state.get("completed", []) if name in basenames]
    known = set(completed)
    order = [name for name in state.get("order", []) if name in basenames and name not in known]
    known.update(order)

    added = [name for name in basenames if name not in known]
    random.shuffle(added)

    state = {"completed": completed, "order": completed + order + added}
    save_state(state)
    return state


def save_state(state: dict[str, list[str]]) -> None:
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    files = dress_files()
    paths = file_map(files)
    state = load_state(files, args.clear)

    try:
        while True:
            completed = state["completed"]
            order = state["order"]
            remaining = [name for name in order if name not in completed]

            if not remaining:
                print("已經全部執行完畢。若要重新執行，請使用 --clear。")
                return

            basename = remaining[0]
            path = paths[basename]
            fname = next_available_name(basename)
            content = path.read_text(encoding="utf-8")

            print(f"-- run {len(completed) + 1}/{len(order)}", flush=True)
            print(f"read {fname}", flush=True)
            copy_to_clipboard(content)

            wait_key()
            copy_to_clipboard(fname)
            print(f"copy {fname}", flush=True)
            completed.append(basename)
            save_state(state)

            wait_key()
    except KeyboardInterrupt:
        print()


if __name__ == "__main__":
    main()
