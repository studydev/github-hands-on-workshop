import urllib.request
import json

url = 'https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io/api/sessions'
data = json.dumps({
    "name": "Test Session",
    "track": "github-pages",
    "startDate": "2026-03-24T09:00:00.000Z",
    "endDate": "2026-03-24T12:00:00.000Z"
}).encode('utf-8')

req = urllib.request.Request(url, data=data, method='POST')
req.add_header('Content-Type', 'application/json')
with urllib.request.urlopen(req) as resp:
    print('Status:', resp.status)
    print('Body:', resp.read().decode())
