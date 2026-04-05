#!/usr/bin/env python3
"""
Generate intro images for all learn modules using Azure OpenAI gpt-image-1.5,
then update each HTML file to display the image on the t-intro slide.
"""

import os
import re
import sys
import time
import base64
import requests
from pathlib import Path
from html.parser import HTMLParser
from dotenv import load_dotenv

# ── Config ──
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
LEARN_DIR = PROJECT_ROOT / "frontend" / "learn"
IMAGES_DIR = PROJECT_ROOT / "frontend" / "images" / "learn"

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

# Modules already done
SKIP_MODULES = {"github-pages", "introduction-to-github"}


# ── HTML Parsing helpers ──
class IntroExtractor(HTMLParser):
    """Extract h1, theory-skill, theory-desc from t-intro div."""

    def __init__(self):
        super().__init__()
        self._in_intro = False
        self._depth = 0
        self._current_tag = None
        self._current_class = ""
        self.h1 = ""
        self.skill = ""
        self.desc = ""
        self.has_two_col = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "div" and attrs_dict.get("id") == "t-intro":
            self._in_intro = True
            self._depth = 1
            return
        if self._in_intro:
            if tag == "div":
                self._depth += 1
                cls = attrs_dict.get("class", "")
                if "theory-two-col" in cls:
                    self.has_two_col = True
            self._current_tag = tag
            self._current_class = attrs_dict.get("class", "")

    def handle_endtag(self, tag):
        if self._in_intro and tag == "div":
            self._depth -= 1
            if self._depth <= 0:
                self._in_intro = False

    def handle_data(self, data):
        if not self._in_intro:
            return
        if self._current_tag == "h1" and not self.h1:
            self.h1 = data.strip()
        if "theory-skill" in self._current_class:
            self.skill += data.strip()
        if "theory-desc" in self._current_class:
            self.desc += data.strip()


def extract_intro(html_path: Path) -> dict:
    parser = IntroExtractor()
    parser.feed(html_path.read_text(encoding="utf-8"))
    # Clean <br> from desc
    return {
        "h1": parser.h1,
        "skill": parser.skill,
        "desc": re.sub(r"<br\s*/?>", " ", parser.desc).strip(),
        "has_two_col": parser.has_two_col,
    }


# ── Prompt builder ──
def build_prompt(h1: str, skill: str, desc: str) -> str:
    return f"""A wide promotional illustration for "{h1}" ({skill}).
Dark navy-charcoal background (#0d1117) with subtle dot grain texture.

Center composition: A stylized visual representation of the concept — clean, floating UI cards, icons, and diagrams that illustrate the key idea of "{skill}". Use context from: {desc}

Include 2-3 relevant visual elements as floating cards or diagrams that represent the core workflow or concept. Use recognizable developer/GitHub iconography (repos, branches, code windows, terminal, shields, gears, etc.) as appropriate.

Bottom area: 3-4 small icon badges in a row, each in a slightly elevated dark card with soft glow underneath, representing key concepts of this module.

Top: Title text "{h1}" in clean white sans-serif font.

Style: Flat vector illustration with minimal soft shadows for depth. No gradients on objects. GitHub dark theme color palette (dark navy background, white/light-gray text, blue/green/orange/purple accent colors). Professional, modern, clean. Similar aesthetic to GitHub's official marketing illustrations. No photorealism, no 3D rendering. Horizontal layout."""


# ── Image generation ──
def generate_image(prompt: str) -> bytes:
    body = {
        "prompt": prompt,
        "n": 1,
        "size": "1536x1024",
        "quality": "medium",
        "output_format": "png",
    }
    resp = requests.post(GENERATION_URL, headers=HEADERS, json=body, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"API error: {data['error']}")
    b64 = data["data"][0]["b64_json"]
    return base64.b64decode(b64)


# ── HTML updater ──
def update_html_intro(html_path: Path, module_name: str):
    """Wrap t-intro content in theory-two-col layout with image on right."""
    content = html_path.read_text(encoding="utf-8")

    # Check if already has two-col
    if "theory-two-col" in content.split('id="t-intro"')[1].split('id="t-learn"')[0] if 'id="t-learn"' in content else "":
        print(f"  [SKIP HTML] {module_name} already has two-col layout")
        return

    # Pattern: find the t-intro div content between header and closing </div>
    # We need to wrap h1, theory-skill, theory-desc, theory-meta in theory-two-col
    pattern = re.compile(
        r'([ \t]*<div id="t-intro"[^>]*>\s*'
        r'<div class="theory-header">.*?</div>\s*)'  # header part (group 1)
        r'(<h1>.*?</h1>\s*'
        r'<p class="theory-skill">.*?</p>\s*'
        r'<p class="theory-desc">.*?</p>\s*'
        r'<div class="theory-meta">.*?</div>)\s*'  # content part (group 2)
        r'([ \t]*</div>)',  # closing div (group 3)
        re.DOTALL,
    )

    def replacer(m):
        header = m.group(1)
        body = m.group(2)
        close = m.group(3)
        # Detect indentation
        indent = "      "
        img_path = f"../images/learn/{module_name}/main.png"
        return (
            f"{header}"
            f'{indent}<div class="theory-two-col">\n'
            f"{indent}  <div class=\"theory-col-text\">\n"
            f"{indent}    {body.strip()}\n"
            f"{indent}  </div>\n"
            f'{indent}  <div class="theory-col-img">\n'
            f'{indent}    <img src="{img_path}" alt="{module_name}" style="max-width:340px;border-radius:12px;">\n'
            f"{indent}  </div>\n"
            f"{indent}</div>\n"
            f"{close}"
        )

    new_content, count = pattern.subn(replacer, content)
    if count == 0:
        print(f"  [WARN] Could not match t-intro pattern for {module_name}")
        return

    html_path.write_text(new_content, encoding="utf-8")
    print(f"  [OK] HTML updated: {module_name}")


# ── Main ──
def main():
    modules = sorted(
        p.stem
        for p in LEARN_DIR.glob("*.html")
        if p.stem not in SKIP_MODULES
    )

    print(f"Found {len(modules)} modules to process (skipping {SKIP_MODULES})\n")

    # Allow filtering from CLI: python generate_learn_images.py module1 module2
    if len(sys.argv) > 1:
        requested = set(sys.argv[1:])
        modules = [m for m in modules if m in requested]
        print(f"Filtered to {len(modules)} modules: {modules}\n")

    for i, module in enumerate(modules, 1):
        html_path = LEARN_DIR / f"{module}.html"
        img_dir = IMAGES_DIR / module
        img_path = img_dir / "main.png"

        print(f"[{i}/{len(modules)}] {module}")

        # Skip if image already exists
        if img_path.exists():
            print(f"  [SKIP] Image already exists")
            # Still update HTML if needed
            info = extract_intro(html_path)
            if not info["has_two_col"]:
                update_html_intro(html_path, module)
            continue

        # Extract intro info
        info = extract_intro(html_path)
        if not info["h1"]:
            print(f"  [SKIP] No h1 found in t-intro")
            continue

        print(f"  Title: {info['h1']}")
        print(f"  Skill: {info['skill']}")

        # Build prompt & generate
        prompt = build_prompt(info["h1"], info["skill"], info["desc"])

        try:
            print(f"  Generating image...")
            img_data = generate_image(prompt)

            # Save
            img_dir.mkdir(parents=True, exist_ok=True)
            img_path.write_bytes(img_data)
            print(f"  [OK] Saved: {img_path.relative_to(PROJECT_ROOT)}")

            # Update HTML
            update_html_intro(html_path, module)

        except Exception as e:
            print(f"  [ERROR] {e}")

        # Rate limit: pause between requests
        if i < len(modules):
            print(f"  Waiting 3s...")
            time.sleep(3)

    print("\nDone!")


if __name__ == "__main__":
    main()
