#!/usr/bin/env python3
"""
Generate a hero image that captures the essence of the GitHub Skills Workshop site.
Uses Azure OpenAI gpt-image to create an illustrative banner.
"""

import os
import base64
import requests
from pathlib import Path
from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_ROOT / "images"

load_dotenv(SCRIPT_DIR / ".env")

ENDPOINT = os.environ["AZURE_OPENAI_ENDPOINT"].rstrip("/")
DEPLOYMENT = os.environ["DEPLOYMENT_NAME"]
API_VERSION = os.environ["OPENAI_API_VERSION"]
API_KEY = os.environ["AZURE_OPENAI_API_KEY"]

GENERATION_URL = (
    f"{ENDPOINT}/openai/deployments/{DEPLOYMENT}/images/generations"
    f"?api-version={API_VERSION}"
)
HEADERS = {"Api-Key": API_KEY, "Content-Type": "application/json"}

PROMPT_BASE = """A wide hero illustration for "GitHub Skills Workshop" — a hands-on learning platform where developers learn GitHub by doing real exercises.

Scene concept: A group of diverse developers (4 people, stylized flat illustration, different skin tones, genders, and hairstyles) sitting together at a long wooden table with laptops open, collaborating and learning. Above them floats a constellation of glowing skill badges and achievement icons connected by thin luminous lines, forming a learning path map in the air — like a skill tree or metro map.

Key visual elements:
- The developers look engaged and happy, some pointing at screens, one giving a thumbs up
- Floating above: recognizable category icons (a rocket, a book, a robot head, a gear, a shield, a curved arrow) connected by thin dotted path lines with small checkmark nodes
- A subtle leaderboard podium (1st, 2nd, 3rd) softly glowing in the background between the floating icons
- Bottom ticker strip with tiny text fragments: "octocat completed!" and "dev123 started!"
- The GitHub Invertocat logo (the original octocat silhouette mark) should appear naturally — e.g. on a laptop screen sticker, or as a subtle watermark behind the floating icons. Keep it faithful to the real GitHub mark shape.

Top center: Bold title "GitHub Skills Workshop" in clean sans-serif.
Subtitle below: "Learn by Doing" in smaller text.

NO specific numbers (no "6 categories", no "37 modules"). Keep it timeless.

Style: Modern flat vector illustration, very similar to GitHub's official Octoverse and Universe event illustrations. Friendly, inviting, professional. Clean lines, minimal soft shadows. No photorealism, no 3D rendering. Horizontal wide format.
"""

PROMPT_DARK = PROMPT_BASE + """
Color scheme — DARK THEME:
Background: deep navy-charcoal (#0d1117) with subtle star-like dot grain texture.
Title text: clean white.
Subtitle: light gray (#8b949e).
Icon accent colors: blue (#58a6ff), green (#3fb950), orange (#f0883e), purple (#a371f7), red (#f85149), yellow (#d29922).
Developers' clothing in muted but distinguishable colors against the dark background.
Overall mood: a cozy late-night coding session with glowing elements."""

PROMPT_LIGHT = PROMPT_BASE + """
Color scheme — LIGHT THEME:
Background: clean white (#ffffff) to very light gray (#f6f8fa).
Title text: dark charcoal (#1f2328).
Subtitle: medium gray (#656d76).
Icon accent colors: blue (#0969da), green (#1a7f37), orange (#bc4c00), purple (#8250df), red (#cf222e), yellow (#9a6700).
Developers' clothing in bright, cheerful colors against the light background.
Floating elements have subtle light shadows instead of glows.
Overall mood: a bright, energetic daytime workshop session."""


def generate_image(prompt: str) -> bytes:
    body = {
        "prompt": prompt,
        "n": 1,
        "size": "1536x1024",
        "quality": "high",
        "output_format": "png",
    }
    resp = requests.post(GENERATION_URL, headers=HEADERS, json=body, timeout=180)
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"API error: {data['error']}")
    b64 = data["data"][0]["b64_json"]
    return base64.b64decode(b64)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for variant, prompt, filename in [
        ("dark", PROMPT_DARK, "workshop-hero-dark.png"),
        ("light", PROMPT_LIGHT, "workshop-hero-light.png"),
    ]:
        output_path = OUTPUT_DIR / filename
        print(f"\nGenerating {variant} theme hero image...")
        print(f"Prompt length: {len(prompt)} chars")

        img_bytes = generate_image(prompt)
        output_path.write_bytes(img_bytes)
        print(f"Saved to: {output_path}")
        print(f"File size: {len(img_bytes) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
