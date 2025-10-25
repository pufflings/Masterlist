#!/usr/bin/env python3
"""
Generate prompts/prompt-index.json listing every HTML file in the prompts folder.

Run this after adding, renaming, or removing prompt pages to refresh the manifest
used by prompts/example.html.
"""

from __future__ import annotations

import json
from pathlib import Path


def log(message: str) -> None:
    print(f"[update_prompt_index] {message}")

ROOT = Path(__file__).resolve().parents[1]
PROMPTS_DIR = ROOT / "prompts"
OUTPUT_FILE = PROMPTS_DIR / "prompt-index.json"


def collect_prompt_files() -> list[str]:
    if not PROMPTS_DIR.exists():
        raise SystemExit(f"Missing prompts directory: {PROMPTS_DIR}")
    files = sorted(
        (path.name for path in PROMPTS_DIR.glob("*.html") if path.is_file()),
        key=lambda name: name.lower(),
    )
    return files


def write_manifest(files: list[str]) -> None:
    OUTPUT_FILE.write_text(json.dumps(files, separators=(",", ":")), encoding="utf-8")


def main() -> None:
    log(f"Starting prompt index rebuild from {PROMPTS_DIR}")
    files = collect_prompt_files()
    write_manifest(files)
    print(f"Wrote {len(files)} prompt entries to {OUTPUT_FILE}")
    log(f"Completed prompt index rebuild -> {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
