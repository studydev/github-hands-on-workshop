import urllib.request, json

BASE = 'https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io/api/sessions'

sessions = [
    (1, 'f87b3b97', 'introduction-to-github'),
    (2, '3d73a707', 'communicate-using-markdown'),
    (3, 'fe72e72d', 'github-pages'),
    (4, '53ea0af7', 'introduction-to-repository-management'),
    (5, '348394ce', 'review-pull-requests'),
    (6, 'f89101e2', 'idea-to-app-with-spark'),
    (7, '82934411', 'resolve-merge-conflicts'),
    (8, 'cc895746', 'introduction-to-git'),
    (9, '33211bf7', 'hello-github-actions'),
    (10, '215e5376', 'test-with-actions'),
]

for num, sid, skill in sessions:
    url = f'{BASE}/{sid}'
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            body = json.loads(resp.read().decode())
            session = body.get('session', body)
            name = session.get('name', 'N/A')
            track = session.get('track', 'N/A')
            match = "O" if track == skill else "X"
            print(f'| {num} | {sid} | {track} | {name} | OK (track match: {match}) |')
    except urllib.error.HTTPError as e:
        print(f'| {num} | {sid} | {skill} | - | NOT FOUND (HTTP {e.code}) |')
    except Exception as e:
        print(f'| {num} | {sid} | {skill} | - | ERROR: {e} |')
