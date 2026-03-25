import urllib.request
import json
import random
import time

API_BASE = 'https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io'
SESSION_ID = 'fe72e72d'
TRACK = 'github-pages'

fake_users = [
    'octocat', 'mona-lisa', 'hubot', 'defunkt', 'mojombo',
    'pjhyett', 'wycats', 'ezmobius', 'ivey', 'ericholscher',
    'technoweenie', 'macournoyer', 'takahashim', 'codeheroine',
    'devjunhong', 'codeguru42', 'hackerman99', 'gitmaster01',
    'opensourcefan',
]

steps_info = [
    (1, 'Pages 활성화'),
    (2, '홈페이지 편집'),
    (3, '사이트 테마 적용'),
    (4, '블로그 작성'),
]

def post_event(payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f'{API_BASE}/api/events', data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req) as resp:
            body = json.loads(resp.read().decode())
            return body.get('status', 'ok')
    except Exception as e:
        return f'error: {e}'

for i, username in enumerate(fake_users):
    repo = f'{username}/skills-github-pages'
    run_base = random.randint(100000000, 999999999)

    # start event
    result = post_event({
        'sessionId': SESSION_ID,
        'type': 'start',
        'username': username,
        'repo': repo,
        'track': TRACK,
        'runId': str(run_base),
        'description': '실습 시작',
    })
    print(f'[{i+1}/19] {username} start: {result}')

    # step events
    for step_num, step_desc in steps_info:
        result = post_event({
            'sessionId': SESSION_ID,
            'type': 'step',
            'step': step_num,
            'description': step_desc,
            'username': username,
            'repo': repo,
            'track': TRACK,
            'runId': f'{run_base}-step{step_num}',
        })
        print(f'    step {step_num} ({step_desc}): {result}')

    # end event
    result = post_event({
        'sessionId': SESSION_ID,
        'type': 'end',
        'username': username,
        'repo': repo,
        'track': TRACK,
        'runId': f'{run_base}-end',
        'description': 'PR 병합',
    })
    print(f'    end: {result}')

print('\nDone! 19 users added.')
