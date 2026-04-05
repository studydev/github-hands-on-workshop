from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ASSET_DIR = REPO_ROOT / "frontend" / "images" / "learn"
IMG_TAG_RE = re.compile(r'<img\s+[^>]*src="(?P<src>[^"]+)"[^>]*>')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Update learn slide HTML to use generated local images.")
    parser.add_argument("--verification-report", required=True, help="Path to verification-report.json")
    parser.add_argument("--asset-dir", default=str(DEFAULT_ASSET_DIR), help="Generated image root")
    parser.add_argument("--apply", action="store_true", help="Write HTML changes in-place")
    parser.add_argument("--output", help="Optional path for a preview plan JSON")
    parser.add_argument("--include-files", nargs="*", default=[], help="Optional list of learn HTML paths to process")
    return parser.parse_args()


def slugify(value: str) -> str:
    return "-".join(part for part in "".join(ch.lower() if ch.isalnum() else "-" for ch in value).split("-") if part)


def relative_asset_path(file_path: str, slide_id: str, asset_dir: Path) -> str:
    file_slug = slugify(Path(file_path).stem)
    slide_slug = slugify(slide_id)
    svg_path = asset_dir / file_slug / f"{slide_slug}.svg"
    png_path = asset_dir / file_slug / f"{slide_slug}.png"
    target = png_path if png_path.exists() else svg_path
    return str(Path("..") / Path(target).relative_to(REPO_ROOT / "frontend"))


def replace_first_image_in_slide(html: str, slide_id: str, new_src: str, alt_text: str) -> str:
    slide_start = html.find(f'id="{slide_id}"')
    if slide_start == -1:
        return html
    next_slide = html.find('<div id="t-', slide_start + 1)
    if next_slide == -1:
        next_slide = len(html)
    block = html[slide_start:next_slide]

    def repl(match: re.Match[str]) -> str:
        tag = match.group(0)
        tag = re.sub(r'src="[^"]+"', f'src="{new_src}"', tag, count=1)
        if 'alt="' in tag:
            tag = re.sub(r'alt="[^"]*"', f'alt="{alt_text}"', tag, count=1)
        else:
            tag = tag[:-1] + f' alt="{alt_text}">'
        return tag

    updated_block, count = IMG_TAG_RE.subn(repl, block, count=1)
    if count == 0:
        return html
    return html[:slide_start] + updated_block + html[next_slide:]


def insert_col_img(html: str, slide_id: str, new_src: str, alt_text: str) -> str:
    slide_start = html.find(f'id="{slide_id}"')
    if slide_start == -1:
        return html
    next_slide = html.find('<div id="t-', slide_start + 1)
    if next_slide == -1:
        next_slide = len(html)
    block = html[slide_start:next_slide]
    marker = '<div class="theory-col-text">'
    if marker not in block or '<div class="theory-col-img">' in block:
        return html
    closing = block.rfind('</div>\n      </div>')
    if closing == -1:
        return html
    insertion = (
        '        <div class="theory-col-img">\n'
        f'          <img src="{new_src}" alt="{alt_text}" loading="lazy" style="max-width:200px;border-radius:12px;">\n'
        '        </div>\n'
    )
    updated_block = block[:closing] + insertion + block[closing:]
    return html[:slide_start] + updated_block + html[next_slide:]


def main() -> None:
    args = parse_args()
    report = json.loads(Path(args.verification_report).read_text(encoding="utf-8"))
    asset_dir = Path(args.asset_dir).resolve()
    file_edits: dict[Path, list[dict[str, Any]]] = {}
    include_files = set(args.include_files)

    for entry in report.get("results", []):
        if include_files and entry.get("file") not in include_files:
            continue
        action = entry.get("verdict", {}).get("action")
        if action not in {"replace", "add"}:
            continue
        target = REPO_ROOT / entry["file"]
        file_edits.setdefault(target, []).append(entry)

    preview: list[dict[str, Any]] = []
    for file_path, edits in file_edits.items():
        original = file_path.read_text(encoding="utf-8")
        updated = original
        for entry in edits:
            asset_path = relative_asset_path(entry["file"], entry["slide_id"], asset_dir)
            alt_text = entry.get("verdict", {}).get("suggested_alt") or entry.get("slide_title", "diagram")
            if entry.get("verdict", {}).get("action") == "replace":
                updated = replace_first_image_in_slide(updated, entry["slide_id"], asset_path, alt_text)
            else:
                updated = insert_col_img(updated, entry["slide_id"], asset_path, alt_text)
            preview.append({
                "file": str(file_path.relative_to(REPO_ROOT)),
                "slide_id": entry["slide_id"],
                "action": entry["verdict"]["action"],
                "asset": asset_path,
            })
        if args.apply and updated != original:
            file_path.write_text(updated, encoding="utf-8")

    if args.output:
        Path(args.output).write_text(json.dumps({"changes": preview}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Prepared {len(preview)} image updates across {len(file_edits)} files")
    if not args.apply:
        print("Dry run only. Re-run with --apply to modify HTML files.")


if __name__ == "__main__":
    main()