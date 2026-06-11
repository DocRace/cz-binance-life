#!/usr/bin/env python3
"""Resolve book_club_stories author_avatar_url to stable pbs.twimg.com URLs via fxtwitter."""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "public" / "data" / "book_club_stories.json"
HANDLE_RE = re.compile(r"@([A-Za-z0-9_]{1,30})")


def upgrade_avatar(url: str) -> str:
    return re.sub(r"_normal\.(jpe?g|png|webp)$", r"_400x400.\1", url, flags=re.I)


def fetch_avatar(handle: str) -> str | None:
    req = urllib.request.Request(
        f"https://api.fxtwitter.com/{handle}",
        headers={"Accept": "application/json", "User-Agent": "cz-booksite-avatar-resolve/1.0"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.load(resp)
    raw = (data.get("user") or {}).get("avatar_url")
    if isinstance(raw, str) and "pbs.twimg.com/profile_images" in raw:
        return upgrade_avatar(raw)
    return None


def main() -> int:
    doc = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    stories = doc.get("stories") or []
    updated = 0
    failed: list[str] = []

    for story in stories:
        handle = None
        if isinstance(story.get("author_display"), str):
            m = HANDLE_RE.search(story["author_display"])
            if m:
                handle = m.group(1)
        if not handle:
            continue

        current = (story.get("author_avatar_url") or "").strip()
        if current.startswith("https://pbs.twimg.com/profile_images"):
            story["author_avatar_url"] = upgrade_avatar(current)
            continue

        try:
            url = fetch_avatar(handle)
            if url:
                story["author_avatar_url"] = url
                updated += 1
                print(f"ok @{handle}")
            else:
                failed.append(handle)
                print(f"skip @{handle} (no avatar in payload)", file=sys.stderr)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            failed.append(handle)
            print(f"fail @{handle}: {exc}", file=sys.stderr)
        time.sleep(0.35)

    doc["avatar_resolve_note"] = (
        "author_avatar_url baked to pbs.twimg.com via scripts/resolve_book_club_avatars.py"
    )
    JSON_PATH.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"done: {updated} updated, {len(failed)} failed, {len(stories)} stories")
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
