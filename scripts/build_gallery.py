#!/usr/bin/env python3
"""Dispatch builds to the independently maintained gallery checkouts."""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GALLERIES = ("gallery1", "gallery2", "gallery3")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build available independent galleries.")
    parser.add_argument("--site", choices=("all", "gallery", "design", *GALLERIES), default="all")
    args = parser.parse_args()
    requested = {"gallery": "gallery1", "design": "gallery3"}.get(args.site, args.site)
    sites = GALLERIES if requested == "all" else (requested,)
    for name in sites:
        builder = ROOT / "sites" / name / "build_gallery.py"
        if not builder.is_file():
            if requested != "all":
                raise SystemExit(f"Missing independent checkout: {builder.parent}")
            print(f"Skipping {name}: clone its independent repository into {builder.parent}.")
            continue
        subprocess.run([sys.executable, str(builder)], check=True)


if __name__ == "__main__":
    main()
