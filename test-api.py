import urllib.request
import json

url = 'https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io/api/sessions'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as resp:
    print('Status:', resp.status)
    print('Body:', resp.read().decode())
