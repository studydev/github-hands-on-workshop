import urllib.request
import json
import time
import random

base = 'https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io'
sid = 'fe72e72d'

users = [
    'octocat', 'mona', 'hubot', 'defunkt', 'mojombo',
    'pjhyett', 'wycats', 'ezmobius', 'ivey', 'kevinclark'
]

# Some will complete, some will only start
completers = users[:7]  # first 7 complete
starters_only = users[7:]  # last 3 only started

for i, username in enumerate(users):
    # Send started event
    data = json.dumps({
        "sessionId": sid,
        "type": "started",
        "username": username,
        "repo": f"{username}/skills-github-pages",
        "track": "github-pages",
        "runId": f"start-{username}-{random.randint(10000,99999)}"
    }).encode()
    req = urllib.request.Request(base + '/api/events', data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req) as resp:
        print(f'[started] {username}:', resp.read().decode())
    time.sleep(0.3)

# Send completed events with staggered timing
for i, username in enumerate(completers):
    time.sleep(0.5 + random.random())
    data = json.dumps({
        "sessionId": sid,
        "type": "completed",
        "username": username,
        "repo": f"{username}/skills-github-pages",
        "track": "github-pages",
        "runId": f"done-{username}-{random.randint(10000,99999)}"
    }).encode()
    req = urllib.request.Request(base + '/api/events', data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req) as resp:
        print(f'[completed] {username}:', resp.read().decode())

print(f'\nDone! {len(users)} started, {len(completers)} completed, {len(starters_only)} in progress')
