"""Retry remaining 3 users for session b0b69412"""
import requests
import time

API = "https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io"
SID = "b0b69412"
TRACK = "GitHub Pages"
STEPS = [
    {"step": 1, "description": "Pages 활성화"},
    {"step": 2, "description": "홈페이지 편집"},
    {"step": 3, "description": "사이트 테마 적용"},
    {"step": 4, "description": "블로그 작성"},
    {"step": 5, "description": "PR 병합"},
]
USERS = [
    {"username": "mona-lisa", "start": "2026-03-25T22:04:25Z", "steps": ["2026-03-25T22:04:25Z","2026-03-25T22:04:26Z","2026-03-25T22:04:26Z","2026-03-25T22:04:26Z","2026-03-25T22:04:26Z"], "end": "2026-03-25T22:04:26Z"},
    {"username": "octocat", "start": "2026-03-25T22:04:25Z", "steps": ["2026-03-25T22:04:25Z","2026-03-25T22:04:25Z","2026-03-25T22:04:25Z","2026-03-25T22:04:25Z","2026-03-25T22:04:25Z"], "end": "2026-03-25T22:04:25Z"},
    {"username": "studydev", "start": "2026-03-25T13:59:54Z", "steps": ["2026-03-25T14:01:29Z","2026-03-25T14:02:48Z","2026-03-25T14:05:16Z",None,"2026-03-25T14:08:55Z"], "end": "2026-03-25T14:08:55Z"},
]

for u in USERS:
    repo = u["username"] + "/skills-github-pages"
    rb = "mock-" + u["username"] + "-" + SID
    r = requests.post(API + "/api/events", json={"sessionId": SID, "type": "start", "username": u["username"], "repo": repo, "track": TRACK, "runId": rb + "-start"}, timeout=10)
    print("start", u["username"], "->", r.status_code, r.text[:60])
    time.sleep(1.2)
    for i, sd in enumerate(STEPS):
        ts = u["steps"][i]
        if ts is None:
            continue
        r = requests.post(API + "/api/events", json={"sessionId": SID, "type": "step", "step": sd["step"], "description": sd["description"], "username": u["username"], "repo": repo, "track": TRACK, "runId": rb + "-step" + str(sd["step"])}, timeout=10)
        print("step" + str(sd["step"]), u["username"], "->", r.status_code, r.text[:60])
        time.sleep(1.2)
    if u["end"]:
        r = requests.post(API + "/api/events", json={"sessionId": SID, "type": "end", "username": u["username"], "repo": repo, "track": TRACK, "runId": rb + "-end"}, timeout=10)
        print("end", u["username"], "->", r.status_code, r.text[:60])
        time.sleep(1.2)
    print("---", u["username"], "done ---")
print("Done!")
