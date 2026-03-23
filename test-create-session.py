import urllib.request
import json

url = 'https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io/api/sessions'
data = json.dumps({
    "name": "Test Session",
    "track": "github-pages",
    "totalSteps": 5,
    "steps": [
        {"step": 1, "name": "Enable GitHub Pages"},
        {"step": 2, "name": "Configure your site"},
        {"step": 3, "name": "Customize your homepage"},
        {"step": 4, "name": "Create a site blog"},
        {"step": 5, "name": "Merge your pull request"}
    ]
}).encode('utf-8')

req = urllib.request.Request(url, data=data, method='POST')
req.add_header('Content-Type', 'application/json')
with urllib.request.urlopen(req) as resp:
    print('Status:', resp.status)
    print('Body:', resp.read().decode())
