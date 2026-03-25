import urllib.request
import json

base = 'https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io'

# 1. Create session
data = json.dumps({"name": "Test v3", "track": "github-pages"}).encode()
req = urllib.request.Request(base + '/api/sessions', data=data, method='POST')
req.add_header('Content-Type', 'application/json')
with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read().decode())
    sid = result['sessionId']
    print('Session created:', sid)

# 2. Send started event
data = json.dumps({"sessionId": sid, "type": "started", "username": "testuser1", "runId": "run-001", "track": "github-pages"}).encode()
req = urllib.request.Request(base + '/api/events', data=data, method='POST')
req.add_header('Content-Type', 'application/json')
with urllib.request.urlopen(req) as resp:
    print('Started:', resp.read().decode())

# 3. Send completed event
data = json.dumps({"sessionId": sid, "type": "completed", "username": "testuser1", "runId": "run-002", "track": "github-pages"}).encode()
req = urllib.request.Request(base + '/api/events', data=data, method='POST')
req.add_header('Content-Type', 'application/json')
with urllib.request.urlopen(req) as resp:
    print('Completed:', resp.read().decode())

# 4. Get leaderboard
req = urllib.request.Request(base + '/api/sessions/' + sid + '/leaderboard')
with urllib.request.urlopen(req) as resp:
    lb = json.loads(resp.read().decode())
    print('Leaderboard:', json.dumps(lb, indent=2))

# 5. Get session with stats
req = urllib.request.Request(base + '/api/sessions/' + sid)
with urllib.request.urlopen(req) as resp:
    sess = json.loads(resp.read().decode())
    print('Stats:', json.dumps(sess.get('stats'), indent=2))
