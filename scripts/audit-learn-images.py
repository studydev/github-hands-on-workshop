from __future__ import annotations

import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LEARN_DIR = REPO_ROOT / "frontend" / "learn"
SLIDE_START_RE = re.compile(r'<div\s+id="(?P<id>t-[^"]+)"\s+class="(?P<class>[^"]*\bstep\b[^"]*\btheory-slide\b[^"]*)"[^>]*>', re.IGNORECASE)
IMG_TAG_RE = re.compile(r'<img\s+(?P<tag>[^>]*src="(?P<src>[^"]+)"[^>]*)>', re.IGNORECASE | re.DOTALL)


def class_tokens(attrs: dict[str, str]) -> set[str]:
    return {token for token in attrs.get("class", "").split() if token}


def compact_text(value: str) -> str:
    return " ".join(value.split())


def extract_attr(tag_text: str, name: str) -> str:
    match = re.search(rf'{name}="([^"]*)"', tag_text, re.IGNORECASE)
    return match.group(1) if match else ""


def within_open_section(block: str, marker: str, index: int) -> bool:
    marker_pos = block.rfind(marker, 0, index)
    if marker_pos == -1:
        return False
    snippet = block[marker_pos:index]
    return snippet.count("<div") > snippet.count("</div>")


def extract_slide_blocks(html_text: str) -> list[dict[str, Any]]:
    matches = list(SLIDE_START_RE.finditer(html_text))
    slides: list[dict[str, Any]] = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(html_text)
        block = html_text[start:end]
        title_match = re.search(r"<h[12][^>]*>(.*?)</h[12]>", block, re.IGNORECASE | re.DOTALL)
        title = compact_text(re.sub(r"<[^>]+>", " ", title_match.group(1))) if title_match else match.group("id")
        images = []
        for image_match in IMG_TAG_RE.finditer(block):
            tag_text = image_match.group("tag")
            image_index = image_match.start()
            images.append({
                "src": image_match.group("src"),
                "alt": extract_attr(tag_text, "alt"),
                "loading": extract_attr(tag_text, "loading"),
                "classes": sorted(extract_attr(tag_text, "class").split()),
                "style": extract_attr(tag_text, "style"),
                "within_col_img": within_open_section(block, 'theory-col-img', image_index),
                "within_flow_card": within_open_section(block, 'flow-step-card', image_index),
                "heading_context": title,
            })

        text_excerpt = compact_text(re.sub(r"<[^>]+>", " ", block))[:500]
        slides.append({
            "slide_id": match.group("id"),
            "classes": sorted(match.group("class").split()),
            "title": title,
            "text_excerpt": text_excerpt,
            "images": images,
            "has_two_col": "theory-two-col" in block,
            "has_col_img": "theory-col-img" in block,
            "col_img_image_count": len(re.findall(r'<div class="theory-col-img">.*?<img\s', block, re.IGNORECASE | re.DOTALL)),
            "flow_card_count": block.count("flow-step-card"),
            "flow_card_image_count": len(re.findall(r'<div class="flow-step-card">.*?<img\s', block, re.IGNORECASE | re.DOTALL)),
            "missing_col_img": "theory-two-col" in block and len(re.findall(r'<div class="theory-col-img">.*?<img\s', block, re.IGNORECASE | re.DOTALL)) == 0,
            "missing_flow_images": block.count("flow-step-card") > len(re.findall(r'<div class="flow-step-card">.*?<img\s', block, re.IGNORECASE | re.DOTALL)),
        })
    return slides


class LearnSlideParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[dict[str, Any]] = []
        self.slides: list[dict[str, Any]] = []
        self.current_slide: dict[str, Any] | None = None
        self.slide_depth = 0
        self.current_heading: str | None = None
        self.current_heading_tag: str | None = None

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = {key: (value or "") for key, value in attrs_list}
        classes = class_tokens(attrs)

        is_slide = tag == "div" and {"step", "theory-slide"}.issubset(classes) and attrs.get("id")
        if is_slide:
            self.current_slide = {
                "slide_id": attrs["id"],
                "classes": sorted(classes),
                "title": "",
                "text_parts": [],
                "images": [],
                "has_two_col": False,
                "has_col_img": False,
                "col_img_image_count": 0,
                "flow_card_count": 0,
                "flow_card_image_count": 0,
            }
            self.slide_depth = 1
            self.slides.append(self.current_slide)
        elif self.current_slide is not None:
            self.slide_depth += 1

        if self.current_slide is not None:
            if tag == "div" and "theory-two-col" in classes:
                self.current_slide["has_two_col"] = True
            if tag == "div" and "theory-col-img" in classes:
                self.current_slide["has_col_img"] = True
            if tag == "div" and "flow-step-card" in classes:
                self.current_slide["flow_card_count"] += 1

            if tag in {"h1", "h2", "h3"}:
                self.current_heading = ""
                self.current_heading_tag = tag

            if tag == "img":
                image_entry = {
                    "src": attrs.get("src", ""),
                    "alt": attrs.get("alt", ""),
                    "loading": attrs.get("loading", ""),
                    "classes": sorted(classes),
                    "style": attrs.get("style", ""),
                    "within_col_img": self._within_class("theory-col-img"),
                    "within_flow_card": self._within_class("flow-step-card"),
                    "heading_context": self.current_slide.get("title", ""),
                }
                self.current_slide["images"].append(image_entry)
                if image_entry["within_col_img"]:
                    self.current_slide["col_img_image_count"] += 1
                if image_entry["within_flow_card"]:
                    self.current_slide["flow_card_image_count"] += 1

        self.stack.append({"tag": tag, "classes": classes})

    def handle_endtag(self, tag: str) -> None:
        if self.current_slide is not None and tag == self.current_heading_tag:
            heading = compact_text(self.current_heading or "")
            if heading and not self.current_slide["title"]:
                self.current_slide["title"] = heading
            self.current_heading = None
            self.current_heading_tag = None

        if self.current_slide is not None:
            self.slide_depth -= 1
            if self.slide_depth == 0:
                self._finalize_current_slide()

        if self.stack:
            self.stack.pop()

    def handle_data(self, data: str) -> None:
        if self.current_slide is None:
            return
        if self.current_heading is not None:
            self.current_heading += data
        stripped = compact_text(data)
        if stripped:
            self.current_slide["text_parts"].append(stripped)

    def _within_class(self, class_name: str) -> bool:
        return any(class_name in frame["classes"] for frame in reversed(self.stack))

    def _finalize_current_slide(self) -> None:
        if self.current_slide is None:
            return
        text = compact_text(" ".join(self.current_slide.pop("text_parts", [])))
        self.current_slide["text_excerpt"] = text[:500]
        self.current_slide["missing_col_img"] = bool(
            self.current_slide["has_two_col"]
            and self.current_slide["col_img_image_count"] == 0
        )
        self.current_slide["missing_flow_images"] = bool(
            self.current_slide["flow_card_count"] > 0
            and self.current_slide["flow_card_image_count"] < self.current_slide["flow_card_count"]
        )
        self.current_slide = None
        self.slide_depth = 0

def audit_file(path: Path) -> dict[str, Any]:
    html_text = path.read_text(encoding="utf-8")
    slides = extract_slide_blocks(html_text)
    image_count = sum(len(slide["images"]) for slide in slides)
    missing_col_img_count = sum(1 for slide in slides if slide["missing_col_img"])
    missing_flow_image_count = sum(1 for slide in slides if slide["missing_flow_images"])
    unique_sources = sorted({image["src"] for slide in slides for image in slide["images"] if image["src"]})
    return {
        "file": path.name,
        "path": str(path.relative_to(REPO_ROOT)),
        "slide_count": len(slides),
        "image_count": image_count,
        "missing_col_img_count": missing_col_img_count,
        "missing_flow_image_count": missing_flow_image_count,
        "slides": slides,
        "unique_image_sources": unique_sources,
    }


def build_summary(files: list[dict[str, Any]]) -> dict[str, Any]:
    all_sources = sorted({src for file_report in files for src in file_report["unique_image_sources"]})
    return {
        "file_count": len(files),
        "total_slides": sum(file_report["slide_count"] for file_report in files),
        "total_images": sum(file_report["image_count"] for file_report in files),
        "files_with_missing_col_img": [
            file_report["path"]
            for file_report in files
            if file_report["missing_col_img_count"]
        ],
        "files_with_missing_flow_images": [
            file_report["path"]
            for file_report in files
            if file_report["missing_flow_image_count"]
        ],
        "unique_image_source_count": len(all_sources),
        "unique_image_sources": all_sources,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit image usage across learn slides.")
    parser.add_argument("--learn-dir", default=str(DEFAULT_LEARN_DIR), help="Path to frontend/learn directory")
    parser.add_argument("--output", required=True, help="Where to write the JSON report")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    learn_dir = Path(args.learn_dir).resolve()
    output_path = Path(args.output).resolve()
    reports = [audit_file(path) for path in sorted(learn_dir.glob("*.html"))]
    payload = {
        "learn_dir": str(learn_dir),
        "summary": build_summary(reports),
        "files": reports,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote audit report: {output_path}")
    print(f"Files: {payload['summary']['file_count']}, slides: {payload['summary']['total_slides']}, images: {payload['summary']['total_images']}")


if __name__ == "__main__":
    main()