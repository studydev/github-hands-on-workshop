from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_MODEL = os.environ.get("OPENAI_MODEL", "gpt-5.4")
DEFAULT_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")


SYSTEM_PROMPT = """You evaluate whether slide images match the educational content around them.
Return strict JSON with keys:
- action: keep | replace | add
- relevance_score: integer from 1 to 5
- reason: concise Korean explanation
- suggested_alt: concise Korean alt text
- suggested_image_description: Korean description for a replacement/additional image
- style_keywords: array of 3 to 6 short keywords
Use action=add only when no image exists and the slide would benefit from one.
Use action=replace when the image is generic, weak, or mismatched.
Use action=keep when the image strongly supports the topic.
Assume the final visual style is a GitHub dark-theme flat vector diagram.
"""

GENERIC_IMAGE_PATTERNS = {
    "github-copilot-social-img.png": "주제별 설명이 필요한 슬라이드에 일반 Copilot 홍보 이미지가 반복 사용됨",
    "collabocats.jpg": "Actions 설명에 범용 마스코트 이미지가 반복 사용됨",
    "actions-hero.webp": "레이블/조건 분기 설명에 범용 Actions 홍보 이미지가 사용됨",
}


def heuristic_verdict(item_type: str, slide: dict[str, Any], image: dict[str, Any] | None = None) -> dict[str, Any]:
    if item_type == "missing-image":
        return {
            "action": "add",
            "relevance_score": 0,
            "reason": "OPENAI_API_KEY 미설정. 두 컬럼 슬라이드에 시각 자료가 없어 추가 대상으로 분류했습니다.",
            "suggested_alt": f"{slide.get('title', slide['slide_id'])} 다이어그램",
            "suggested_image_description": (
                f"{slide.get('title', slide['slide_id'])}의 핵심 개념과 단계 흐름을 설명하는 다이어그램. "
                f"슬라이드 요약: {slide.get('text_excerpt', '')[:180]}"
            ),
            "style_keywords": ["github-dark", "flat-diagram", "teaching-visual"],
        }

    src = (image or {}).get("src", "")
    for pattern, reason in GENERIC_IMAGE_PATTERNS.items():
        if pattern in src:
            return {
                "action": "replace",
                "relevance_score": 2,
                "reason": f"OPENAI_API_KEY 미설정. 휴리스틱 분류: {reason}",
                "suggested_alt": f"{slide.get('title', slide['slide_id'])} 시각 설명",
                "suggested_image_description": (
                    f"{slide.get('title', slide['slide_id'])}를 설명하는 주제 특화 다이어그램. "
                    f"슬라이드 요약: {slide.get('text_excerpt', '')[:180]}"
                ),
                "style_keywords": ["github-dark", "topic-specific", "flat-diagram"],
            }

    return {
        "action": "keep",
        "relevance_score": None,
        "reason": "OPENAI_API_KEY 미설정. 휴리스틱상 즉시 교체 대상은 아니므로 유지로 표시했습니다.",
        "suggested_alt": (image or {}).get("alt", ""),
        "suggested_image_description": "",
        "style_keywords": [],
    }


def call_responses_api(api_key: str, model: str, payload: dict[str, Any]) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{DEFAULT_BASE_URL}/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        body = json.loads(response.read().decode("utf-8"))
    text_chunks: list[str] = []
    for item in body.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text":
                text_chunks.append(content.get("text", ""))
    raw_text = "\n".join(text_chunks).strip()
    if not raw_text:
        raise ValueError("No output_text returned from Responses API")
    return json.loads(raw_text)


def build_image_prompt(file_path: str, slide: dict[str, Any], image: dict[str, Any]) -> dict[str, Any]:
    user_text = {
        "type": "input_text",
        "text": (
            f"파일: {file_path}\n"
            f"슬라이드 ID: {slide['slide_id']}\n"
            f"슬라이드 제목: {slide.get('title', '')}\n"
            f"슬라이드 본문 요약: {slide.get('text_excerpt', '')}\n"
            f"이미지 alt: {image.get('alt', '')}\n"
            f"이미지 위치: {'우측 시각 영역' if image.get('within_col_img') else '본문/카드'}\n"
            "이 이미지가 슬라이드 내용을 얼마나 잘 설명하는지 평가하고, 필요 시 교체 이미지를 제안하세요."
        ),
    }
    content: list[dict[str, Any]] = [user_text]
    src = image.get("src", "")
    if src.startswith("http://") or src.startswith("https://"):
        content.append({"type": "input_image", "image_url": src})
    return {
        "model": DEFAULT_MODEL,
        "input": [
            {"role": "system", "content": [{"type": "input_text", "text": SYSTEM_PROMPT}]},
            {"role": "user", "content": content},
        ],
    }


def build_missing_prompt(file_path: str, slide: dict[str, Any]) -> dict[str, Any]:
    return {
        "model": DEFAULT_MODEL,
        "input": [
            {"role": "system", "content": [{"type": "input_text", "text": SYSTEM_PROMPT}]},
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            f"파일: {file_path}\n"
                            f"슬라이드 ID: {slide['slide_id']}\n"
                            f"슬라이드 제목: {slide.get('title', '')}\n"
                            f"슬라이드 본문 요약: {slide.get('text_excerpt', '')}\n"
                            "이 슬라이드에는 시각 영역 이미지가 없습니다. 어떤 이미지를 추가해야 학습 이해도가 높아질지 제안하세요."
                        ),
                    }
                ],
            },
        ],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate learn-slide images with GPT-5.4.")
    parser.add_argument("--audit-report", required=True, help="Path to audit-report.json")
    parser.add_argument("--output", required=True, help="Path to write verification-report.json")
    parser.add_argument("--limit", type=int, default=0, help="Optional max item count for quick runs")
    parser.add_argument("--include-files", nargs="*", default=[], help="Optional list of learn HTML paths to process")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    audit_path = Path(args.audit_report).resolve()
    output_path = Path(args.output).resolve()
    api_key = os.environ.get("OPENAI_API_KEY", "")
    audit_report = json.loads(audit_path.read_text(encoding="utf-8"))
    results: list[dict[str, Any]] = []
    processed = 0
    include_files = set(args.include_files)

    for file_report in audit_report.get("files", []):
        file_path = file_report["path"]
        if include_files and file_path not in include_files:
            continue
        for slide in file_report.get("slides", []):
            for image in slide.get("images", []):
                if args.limit and processed >= args.limit:
                    break
                prompt = build_image_prompt(file_path, slide, image)
                if api_key:
                    try:
                        verdict = call_responses_api(api_key, DEFAULT_MODEL, prompt)
                    except (urllib.error.URLError, ValueError, json.JSONDecodeError) as exc:
                        verdict = {
                            "action": "replace",
                            "relevance_score": 0,
                            "reason": f"API 호출 실패: {exc}",
                            "suggested_alt": image.get("alt", ""),
                            "suggested_image_description": "",
                            "style_keywords": [],
                        }
                else:
                    verdict = heuristic_verdict("existing-image", slide, image)
                    verdict["prompt"] = prompt
                results.append({
                    "file": file_path,
                    "slide_id": slide["slide_id"],
                    "slide_title": slide.get("title", ""),
                    "type": "existing-image",
                    "image": image,
                    "verdict": verdict,
                })
                processed += 1

            if slide.get("missing_col_img"):
                if args.limit and processed >= args.limit:
                    break
                prompt = build_missing_prompt(file_path, slide)
                if api_key:
                    try:
                        verdict = call_responses_api(api_key, DEFAULT_MODEL, prompt)
                    except (urllib.error.URLError, ValueError, json.JSONDecodeError) as exc:
                        verdict = {
                            "action": "add",
                            "relevance_score": 0,
                            "reason": f"API 호출 실패: {exc}",
                            "suggested_alt": "",
                            "suggested_image_description": "",
                            "style_keywords": [],
                        }
                else:
                    verdict = heuristic_verdict("missing-image", slide)
                    verdict["prompt"] = prompt
                results.append({
                    "file": file_path,
                    "slide_id": slide["slide_id"],
                    "slide_title": slide.get("title", ""),
                    "type": "missing-image",
                    "verdict": verdict,
                })
                processed += 1

    payload = {
        "model": DEFAULT_MODEL,
        "audit_report": str(audit_path),
        "result_count": len(results),
        "results": results,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote verification report: {output_path}")
    if not api_key:
        print("OPENAI_API_KEY is not set; prompts were recorded for later execution.")


if __name__ == "__main__":
    main()