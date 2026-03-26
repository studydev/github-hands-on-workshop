"""Seed mock events for session b0b69412 (GitHub Pages)"""
import requests
import time

API = "https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io"
SESSION_ID = "b0b69412"
TRACK = "GitHub Pages"

STEPS = [
    {"step": 1, "description": "Pages 활성화"},
    {"step": 2, "description": "홈페이지 편집"},
    {"step": 3, "description": "사이트 테마 적용"},
    {"step": 4, "description": "블로그 작성"},
    {"step": 5, "description": "PR 병합"},
]

# Users with timestamps (start, step1-5, end)
USERS = [
    {"username": "opensourcefan",  "start": "2026-03-25T22:04:33Z", "steps": ["2026-03-25T22:04:33Z","2026-03-25T22:04:33Z","2026-03-25T22:04:33Z","2026-03-25T22:04:33Z","2026-03-25T22:04:33Z"], "end": "2026-03-25T22:04:33Z"},
    {"username": "gitmaster01",    "start": "2026-03-25T22:04:32Z", "steps": ["2026-03-25T22:04:32Z","2026-03-25T22:04:32Z","2026-03-25T22:04:32Z","2026-03-25T22:04:33Z","2026-03-25T22:04:33Z"], "end": "2026-03-25T22:04:33Z"},
    {"username": "hackerman99",    "start": "2026-03-25T22:04:32Z", "steps": ["2026-03-25T22:04:32Z","2026-03-25T22:04:32Z","2026-03-25T22:04:32Z","2026-03-25T22:04:32Z","2026-03-25T22:04:32Z"], "end": "2026-03-25T22:04:32Z"},
    {"username": "codeguru42",     "start": "2026-03-25T22:04:31Z", "steps": ["2026-03-25T22:04:31Z","2026-03-25T22:04:31Z","2026-03-25T22:04:31Z","2026-03-25T22:04:31Z","2026-03-25T22:04:31Z"], "end": "2026-03-25T22:04:32Z"},
    {"username": "devjunhong",     "start": "2026-03-25T22:04:31Z", "steps": ["2026-03-25T22:04:31Z","2026-03-25T22:04:31Z","2026-03-25T22:04:31Z","2026-03-25T22:04:31Z","2026-03-25T22:04:31Z"], "end": "2026-03-25T22:04:31Z"},
    {"username": "codeheroine",    "start": "2026-03-25T22:04:30Z", "steps": ["2026-03-25T22:04:31Z","2026-03-25T22:04:31Z","2026-03-25T22:04:31Z","2026-03-25T22:04:31Z","2026-03-25T22:04:31Z"], "end": "2026-03-25T22:04:31Z"},
    {"username": "takahashim",     "start": "2026-03-25T22:04:30Z", "steps": ["2026-03-25T22:04:30Z","2026-03-25T22:04:30Z","2026-03-25T22:04:30Z","2026-03-25T22:04:30Z","2026-03-25T22:04:30Z"], "end": "2026-03-25T22:04:30Z"},
    {"username": "webdev_sarah",   "start": "2026-03-25T22:04:30Z", "steps": ["2026-03-25T22:04:30Z","2026-03-25T22:04:30Z","2026-03-25T22:04:30Z","2026-03-25T22:04:30Z","2026-03-25T22:04:30Z"], "end": "2026-03-25T22:04:30Z"},
    {"username": "cloudninja",     "start": "2026-03-25T22:04:29Z", "steps": ["2026-03-25T22:04:29Z","2026-03-25T22:04:29Z","2026-03-25T22:04:29Z","2026-03-25T22:04:29Z","2026-03-25T22:04:29Z"], "end": "2026-03-25T22:04:29Z"},
    {"username": "pythonista",     "start": "2026-03-25T22:04:29Z", "steps": ["2026-03-25T22:04:29Z","2026-03-25T22:04:29Z","2026-03-25T22:04:29Z","2026-03-25T22:04:29Z","2026-03-25T22:04:29Z"], "end": "2026-03-25T22:04:29Z"},
    {"username": "rustacean",      "start": "2026-03-25T22:04:28Z", "steps": ["2026-03-25T22:04:28Z","2026-03-25T22:04:28Z","2026-03-25T22:04:28Z","2026-03-25T22:04:28Z","2026-03-25T22:04:28Z"], "end": "2026-03-25T22:04:28Z"},
    {"username": "golanggopher",   "start": "2026-03-25T22:04:28Z", "steps": ["2026-03-25T22:04:28Z","2026-03-25T22:04:28Z","2026-03-25T22:04:28Z","2026-03-25T22:04:28Z","2026-03-25T22:04:28Z"], "end": "2026-03-25T22:04:28Z"},
    {"username": "devops_queen",   "start": "2026-03-25T22:04:27Z", "steps": ["2026-03-25T22:04:27Z","2026-03-25T22:04:27Z","2026-03-25T22:04:27Z","2026-03-25T22:04:27Z","2026-03-25T22:04:27Z"], "end": "2026-03-25T22:04:27Z"},
    {"username": "frontendking",   "start": "2026-03-25T22:04:27Z", "steps": ["2026-03-25T22:04:27Z","2026-03-25T22:04:27Z","2026-03-25T22:04:27Z","2026-03-25T22:04:27Z","2026-03-25T22:04:27Z"], "end": "2026-03-25T22:04:27Z"},
    {"username": "mojombo",        "start": "2026-03-25T22:04:26Z", "steps": ["2026-03-25T22:04:27Z","2026-03-25T22:04:27Z","2026-03-25T22:04:27Z","2026-03-25T22:04:27Z","2026-03-25T22:04:27Z"], "end": "2026-03-25T22:04:27Z"},
    {"username": "defunkt",        "start": "2026-03-25T22:04:26Z", "steps": ["2026-03-25T22:04:26Z","2026-03-25T22:04:26Z","2026-03-25T22:04:26Z","2026-03-25T22:04:26Z","2026-03-25T22:04:26Z"], "end": "2026-03-25T22:04:26Z"},
    {"username": "hubot",          "start": "2026-03-25T22:04:26Z", "steps": ["2026-03-25T22:04:26Z","2026-03-25T22:04:26Z","2026-03-25T22:04:26Z","2026-03-25T22:04:26Z","2026-03-25T22:04:26Z"], "end": "2026-03-25T22:04:26Z"},
    {"username": "mona-lisa",      "start": "2026-03-25T22:04:25Z", "steps": ["2026-03-25T22:04:25Z","2026-03-25T22:04:26Z","2026-03-25T22:04:26Z","2026-03-25T22:04:26Z","2026-03-25T22:04:26Z"], "end": "2026-03-25T22:04:26Z"},
    {"username": "octocat",        "start": "2026-03-25T22:04:25Z", "steps": ["2026-03-25T22:04:25Z","2026-03-25T22:04:25Z","2026-03-25T22:04:25Z","2026-03-25T22:04:25Z","2026-03-25T22:04:25Z"], "end": "2026-03-25T22:04:25Z"},
    {"username": "studydev",       "start": "2026-03-25T13:59:54Z", "steps": ["2026-03-25T14:01:29Z","2026-03-25T14:02:48Z","2026-03-25T14:05:16Z",None,"2026-03-25T14:08:55Z"], "end": "2026-03-25T14:08:55Z"},
]

def send_event(payload):
    try:
        r = requests.post(f"{API}/api/events", json=payload, timeout=10)
        status = r.json().get("status", "?")
        print(f"  {payload['type']:5s} {payload['username']:20s} -> {r.status_code} {status}")
        return r.status_code
    except Exception as e:
        print(f"  ERROR: {e}")
        return 0

def main():
    count = 0
    for u in USERS:
        repo = f"{u['username']}/skills-github-pages"
        run_base = f"mock-{u['username']}-{SESSION_ID}"

        # Start event
        send_event({
            "sessionId": SESSION_ID,
            "type": "start",
            "username": u["username"],
            "repo": repo,
            "track": TRACK,
            "runId": f"{run_base}-start",
            "timestamp": u["start"],
        })
        count += 1
        time.sleep(0.3)

        # Step events
        for i, step_def in enumerate(STEPS):
            ts = u["steps"][i]
            if ts is None:
                continue
            send_event({
                "sessionId": SESSION_ID,
                "type": "step",
                "step": step_def["step"],
                "description": step_def["description"],
                "username": u["username"],
                "repo": repo,
                "track": TRACK,
                "runId": f"{run_base}-step{step_def['step']}",
                "timestamp": ts,
            })
            count += 1
            time.sleep(0.3)

        # End event
        if u["end"]:
            send_event({
                "sessionId": SESSION_ID,
                "type": "end",
                "username": u["username"],
                "repo": repo,
                "track": TRACK,
                "runId": f"{run_base}-end",
                "timestamp": u["end"],
            })
            count += 1
            time.sleep(0.3)

        print(f"--- {u['username']} done ---")

    print(f"\nTotal events sent: {count}")

if __name__ == "__main__":
    main()
