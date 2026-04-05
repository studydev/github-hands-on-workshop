from __future__ import annotations

import argparse
import json
import os
import textwrap
import urllib.error
import urllib.request
import xml.sax.saxutils as saxutils
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = REPO_ROOT / "frontend" / "images" / "learn"
DEFAULT_TEXT_MODEL = os.environ.get("OPENAI_MODEL", "gpt-5.4")
DEFAULT_IMAGE_MODEL = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1")
DEFAULT_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")


STYLE_GUIDE = """GitHub dark theme flat vector diagram, minimal text, clean geometry,
high contrast, navy background, blue accent, orange emphasis, no logos, no people,
presentation-friendly, visually centered, consistent educational infographic style."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate learn-slide images from verification results.")
    parser.add_argument("--verification-report", required=True, help="Path to verification-report.json")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Directory for generated assets")
    parser.add_argument("--limit", type=int, default=0, help="Optional max image count")
    parser.add_argument("--placeholder-only", action="store_true", help="Generate themed SVG placeholders instead of API images")
    parser.add_argument("--include-files", nargs="*", default=[], help="Optional list of learn HTML paths to process")
    return parser.parse_args()


def slugify(value: str) -> str:
    return "-".join(part for part in "".join(ch.lower() if ch.isalnum() else "-" for ch in value).split("-") if part)


def build_prompt(entry: dict[str, Any]) -> str:
    verdict = entry.get("verdict", {})
    description = verdict.get("suggested_image_description") or entry.get("slide_title") or entry.get("slide_id")
    style_keywords = ", ".join(verdict.get("style_keywords", []))
    return (
        f"{description}. "
        f"Slide context: {entry.get('slide_title', '')}. "
        f"Visual style: {STYLE_GUIDE} "
        f"Extra keywords: {style_keywords}. "
        "Aspect ratio 4:3, suitable for a narrow right-side visual panel in a presentation."
    )


def generate_placeholder_svg(title: str, subtitle: str) -> str:
    safe_title = saxutils.escape(title[:60])
    safe_subtitle = saxutils.escape(subtitle[:140])
    wrapped = textwrap.wrap(safe_subtitle, width=28)[:4]
    lines = "".join(
        f'<text x="32" y="{150 + index * 26}" font-size="18" fill="#c9d1d9" font-family="Arial, sans-serif">{line}</text>'
        for index, line in enumerate(wrapped)
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1117" />
      <stop offset="100%" stop-color="#161b22" />
    </linearGradient>
  </defs>
  <rect width="800" height="600" rx="28" fill="url(#g)" />
  <circle cx="646" cy="152" r="86" fill="#1f6feb" opacity="0.18" />
  <circle cx="690" cy="116" r="18" fill="#f0883e" opacity="0.95" />
  <rect x="32" y="40" width="240" height="28" rx="14" fill="#1f6feb" opacity="0.18" />
  <text x="32" y="105" font-size="34" font-weight="700" fill="#e6edf3" font-family="Arial, sans-serif">{safe_title}</text>
  {lines}
  <rect x="32" y="454" width="250" height="12" rx="6" fill="#58a6ff" opacity="0.85" />
  <rect x="32" y="484" width="170" height="12" rx="6" fill="#f0883e" opacity="0.75" />
  <rect x="510" y="332" width="210" height="150" rx="18" fill="#111d2f" stroke="#58a6ff" stroke-width="2" opacity="0.9" />
  <path d="M548 404h134" stroke="#58a6ff" stroke-width="10" stroke-linecap="round" opacity="0.9" />
  <path d="M548 432h96" stroke="#c9d1d9" stroke-width="10" stroke-linecap="round" opacity="0.6" />
  <path d="M548 460h64" stroke="#c9d1d9" stroke-width="10" stroke-linecap="round" opacity="0.4" />
</svg>'''


def call_image_api(api_key: str, prompt: str) -> bytes:
    request = urllib.request.Request(
        f"{DEFAULT_BASE_URL}/images/generations",
        data=json.dumps({
            "model": DEFAULT_IMAGE_MODEL,
            "prompt": prompt,
            "size": "1024x1024",
        }).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        body = json.loads(response.read().decode("utf-8"))
    image_base64 = body["data"][0].get("b64_json")
    if not image_base64:
        raise ValueError("Image API returned no b64_json payload")
    import base64

    return base64.b64decode(image_base64)


def main() -> None:
    args = parse_args()
    report_path = Path(args.verification_report).resolve()
    output_dir = Path(args.output_dir).resolve()
    api_key = os.environ.get("OPENAI_API_KEY", "")
    report = json.loads(report_path.read_text(encoding="utf-8"))
    created: list[dict[str, str]] = []
    count = 0
    include_files = set(args.include_files)

    for entry in report.get("results", []):
        if include_files and entry.get("file") not in include_files:
            continue
        action = entry.get("verdict", {}).get("action")
        if action not in {"replace", "add"}:
            continue
        if args.limit and count >= args.limit:
            break
        file_slug = slugify(Path(entry["file"]).stem)
        slide_slug = slugify(entry["slide_id"])
        target_dir = output_dir / file_slug
        target_dir.mkdir(parents=True, exist_ok=True)
        prompt = build_prompt(entry)
        image_path = target_dir / f"{slide_slug}.svg"

        if args.placeholder_only or not api_key:
            svg = generate_placeholder_svg(entry.get("slide_title", slide_slug), entry.get("verdict", {}).get("suggested_image_description", ""))
            image_path.write_text(svg, encoding="utf-8")
        else:
            try:
                image_bytes = call_image_api(api_key, prompt)
                image_path = target_dir / f"{slide_slug}.png"
                image_path.write_bytes(image_bytes)
            except (urllib.error.URLError, ValueError, KeyError) as exc:
                svg = generate_placeholder_svg(entry.get("slide_title", slide_slug), f"API 실패: {exc}")
                image_path.write_text(svg, encoding="utf-8")

        created.append({
            "file": entry["file"],
            "slide_id": entry["slide_id"],
            "action": action,
            "output": str(image_path.relative_to(REPO_ROOT)),
            "prompt": prompt,
        })
        count += 1

    manifest_path = output_dir / "generated-manifest.json"
    manifest_path.write_text(json.dumps({"items": created}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(created)} assets under {output_dir}")
    print(f"Manifest: {manifest_path}")
    if not api_key and not args.placeholder_only:
        print("OPENAI_API_KEY is not set; SVG placeholders were generated instead.")


if __name__ == "__main__":
    main()