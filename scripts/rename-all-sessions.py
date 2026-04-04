#!/usr/bin/env python3
"""
Rename 'All' sessions: match track field to skill modules and update name to 'All - {module title}'.
"""
import json
import os
import urllib.request

API_BASE = "https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

# Module data: repo -> Korean module title (from CATEGORIES in app.js)
REPO_TO_TITLE = {
    "introduction-to-github": "인터넷에 내 공간 선점하기",
    "communicate-using-markdown": "내 글을 있어 보이게 만드는 비법",
    "github-pages": "클릭 한 번으로 내 사이트 올리기",
    "introduction-to-git": "내 코드에 타임머신 달기",
    "review-pull-requests": "동료 코드, 피드백 주고받기",
    "resolve-merge-conflicts": "코드 충돌? 두렵지 않다",
    "code-with-codespaces": "내 PC 없이도 코딩하기",
    "introduction-to-repository-management": "팀원과 함께 프로젝트 관리하기",
    "change-commit-history": "커밋 히스토리 다시 쓰기",
    "connect-the-dots": "GitHub 기능 탐색하기",
    "getting-started-with-github-copilot": "AI 동료 첫 출근",
    "customize-your-github-copilot-experience": "AI 동료 길들이기",
    "copilot-code-review": "AI가 코드 검토",
    "integrate-mcp-with-copilot": "AI에게 새로운 능력 장착",
    "expand-your-team-with-copilot": "이슈만 올리면 AI가 PR까지",
    "create-applications-with-the-copilot-cli": "Copilot CLI로 앱 만들기",
    "modernize-your-legacy-code-with-github-copilot": "10년 묵은 코드 AI 번역",
    "scale-institutional-knowledge-using-copilot-spaces": "신입도 바로 일하는 팀",
    "build-applications-w-copilot-agent-mode": "AI와 함께 앱 완성",
    "idea-to-app-with-spark": "말로 설명하면 AI가 앱을 뚝딱",
    "copilot-codespaces-vscode": "AI + Codespaces + VS Code",
    "your-first-extension-for-github-copilot": "Copilot 확장 프로그램 만들기",
    "hello-github-actions": "첫 로봇 일꾼 고용",
    "test-with-actions": "실수 잡아주는 시스템",
    "ai-in-actions": "파이프라인에 AI 두뇌",
    "write-javascript-actions": "JavaScript로 나만의 Action",
    "create-ai-powered-actions": "AI 기반 Action 만들기",
    "publish-docker-images": "어디서나 쓸 수 있게 포장",
    "reusable-workflows": "10개 프로젝트에 재사용",
    "release-based-workflow": "릴리스 기반 배포 전략",
    "deploy-to-azure": "Azure에 자동 배포",
    "secure-repository-supply-chain": "취약점 자동 찾기",
    "introduction-to-codeql": "AI 보안 구멍 찾기",
    "introduction-to-secret-scanning": "비밀번호 유출 방지",
    "configure-codeql-language-matrix": "CodeQL 언어 매트릭스 설정",
    "secure-code-game": "해커 입장에서 뷰어보기",
    "migrate-ado-repository": "하나도 안 버리고 GitHub으로 이사",
}

# Also build a lookup: skill name (lowercase) -> module title
SKILL_TO_TITLE = {}
REPO_SKILL_MAP = {
    "introduction-to-github": "Introduction to GitHub",
    "communicate-using-markdown": "Communicate using Markdown",
    "github-pages": "GitHub Pages",
    "introduction-to-git": "Introduction to Git",
    "review-pull-requests": "Review Pull Requests",
    "resolve-merge-conflicts": "Resolve Merge Conflicts",
    "code-with-codespaces": "Code with Codespaces",
    "introduction-to-repository-management": "Intro to Repository Management",
    "change-commit-history": "Change Commit History",
    "connect-the-dots": "Connect the Dots",
    "getting-started-with-github-copilot": "Getting Started with GitHub Copilot",
    "customize-your-github-copilot-experience": "Customize your GitHub Copilot Experience",
    "copilot-code-review": "GitHub Copilot Code Review",
    "integrate-mcp-with-copilot": "Integrate MCP with GitHub Copilot",
    "expand-your-team-with-copilot": "Expand your team with Copilot coding agent",
    "create-applications-with-the-copilot-cli": "Create Applications with Copilot CLI",
    "modernize-your-legacy-code-with-github-copilot": "Modernize your legacy code with GitHub Copilot",
    "scale-institutional-knowledge-using-copilot-spaces": "Scale institutional knowledge with Copilot Spaces",
    "build-applications-w-copilot-agent-mode": "Build apps with Copilot agent mode",
    "idea-to-app-with-spark": "Turn an idea into an app with GitHub Spark",
    "copilot-codespaces-vscode": "Copilot + Codespaces + VS Code",
    "your-first-extension-for-github-copilot": "Your First Extension for GitHub Copilot",
    "hello-github-actions": "Hello GitHub Actions",
    "test-with-actions": "Test with Actions",
    "ai-in-actions": "AI in Actions",
    "write-javascript-actions": "Write JavaScript Actions",
    "create-ai-powered-actions": "Create AI Powered Actions",
    "publish-docker-images": "Publish Docker Images",
    "reusable-workflows": "Create and use reusable workflows",
    "release-based-workflow": "Release Based Workflow",
    "deploy-to-azure": "Deploy to Azure",
    "secure-repository-supply-chain": "Secure your repository supply chain",
    "introduction-to-codeql": "Introduction to CodeQL",
    "introduction-to-secret-scanning": "Introduction to secret scanning",
    "configure-codeql-language-matrix": "Configure CodeQL Language Matrix",
    "secure-code-game": "Secure code game",
    "migrate-ado-repository": "Migrate an Azure DevOps Repository",
}

# Build lookup: track field (which is the skill name or repo name) -> module title
TRACK_TO_TITLE = {}
for repo, title in REPO_TO_TITLE.items():
    TRACK_TO_TITLE[repo.lower()] = title
    skill_name = REPO_SKILL_MAP.get(repo, "")
    if skill_name:
        TRACK_TO_TITLE[skill_name.lower()] = title


def find_module_title(track):
    """Find module title from track field."""
    track_lower = track.lower().strip()
    # Direct match
    if track_lower in TRACK_TO_TITLE:
        return TRACK_TO_TITLE[track_lower]
    # Partial match: check if track contains a repo name or skill name
    for key, title in TRACK_TO_TITLE.items():
        if key in track_lower or track_lower in key:
            return title
    return None


def main():
    # Fetch all sessions
    req = urllib.request.Request(f"{API_BASE}/api/sessions")
    with urllib.request.urlopen(req) as resp:
        sessions = json.loads(resp.read())

    all_sessions = [s for s in sessions if s.get("name", "").startswith("All")]
    print(f"Found {len(all_sessions)} sessions starting with 'All'\n")

    updates = []
    for s in all_sessions:
        track = s.get("track", "")
        module_title = find_module_title(track)
        if module_title:
            new_name = f"All - {module_title}"
            if s["name"] != new_name:
                updates.append((s["id"], s["name"], new_name, track))

    if not updates:
        print("No updates needed.")
        return

    print(f"Will rename {len(updates)} sessions:\n")
    for sid, old, new, track in updates:
        print(f"  [{sid}] {old}")
        print(f"       -> {new}")
        print(f"       (track: {track})\n")

    confirm = input("Proceed? (y/N): ").strip().lower()
    if confirm != "y":
        print("Cancelled.")
        return

    for sid, old, new, track in updates:
        # Fetch existing session to get all fields
        req_get = urllib.request.Request(f"{API_BASE}/api/sessions/{sid}")
        with urllib.request.urlopen(req_get) as resp:
            existing = json.loads(resp.read())

        payload = {
            "name": new,
            "track": existing.get("track", track),
            "startDate": existing.get("startDate"),
            "endDate": existing.get("endDate"),
        }
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            f"{API_BASE}/api/sessions/{sid}",
            data=data,
            headers={
                "Content-Type": "application/json",
                "x-admin-password": ADMIN_PASSWORD,
            },
            method="PUT",
        )
        try:
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read())
                print(f"  OK: {sid} -> {result.get('name', new)}")
        except Exception as e:
            print(f"  FAIL: {sid} - {e}")

    print(f"\nDone! {len(updates)} sessions renamed.")


if __name__ == "__main__":
    main()
