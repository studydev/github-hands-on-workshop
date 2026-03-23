# GitHub Skills 워크플로우 연동 가이드

이 문서는 GitHub Skills 워크플로우에서 Workshop Tracker API로 시작과 완료 이벤트를 보내는 방법을 설명합니다.

## 원칙

- 학생은 별도 설정을 하지 않습니다.
- 강사가 템플릿 워크플로우에 세션 ID와 API URL만 넣습니다.
- 중간 step은 추적하지 않습니다.
- started 와 completed 두 이벤트만 전송합니다.
- Tracker 호출 실패가 본 실습 흐름을 깨지 않도록 continue-on-error: true 를 사용합니다.

## 준비 사항

1. 대시보드에서 세션을 생성합니다.
2. 생성된 sessionId 를 복사합니다.
3. 아래 API URL 을 워크플로우에 사용합니다.

```text
https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io
```

## 시작 이벤트 추가

시작 이벤트는 학생이 실습을 시작하는 워크플로우에서 한 번만 보내면 됩니다.

```yaml
- name: Report Start to Workshop Tracker
  if: success()
  continue-on-error: true
  run: |
    curl -sf -X POST "https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io/api/events" \
      -H "Content-Type: application/json" \
      -d '{
        "sessionId": "<SESSION_ID>",
        "type": "started",
        "username": "'$GITHUB_ACTOR'",
        "repo": "'$GITHUB_REPOSITORY'",
        "track": "github-pages",
        "runId": "start-'$GITHUB_RUN_ID'"
      }'
```

## 완료 이벤트 추가

완료 이벤트는 마지막 과제가 끝나는 워크플로우에서 한 번만 보내면 됩니다.

```yaml
- name: Report Completion to Workshop Tracker
  if: success()
  continue-on-error: true
  run: |
    curl -sf -X POST "https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io/api/events" \
      -H "Content-Type: application/json" \
      -d '{
        "sessionId": "<SESSION_ID>",
        "type": "completed",
        "username": "'$GITHUB_ACTOR'",
        "repo": "'$GITHUB_REPOSITORY'",
        "track": "github-pages",
        "runId": "complete-'$GITHUB_RUN_ID'"
      }'
```

## 권장 적용 위치

- 시작 이벤트: 0-start 계열 워크플로우의 성공 시점
- 완료 이벤트: 마지막 step 워크플로우 또는 finish_exercise 직전

## 필드 설명

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| sessionId | 예 | 대시보드에서 생성한 세션 ID |
| type | 예 | started 또는 completed |
| username | 예 | GitHub 사용자명, 보통 GITHUB_ACTOR |
| repo | 아니오 | 저장소 이름, 보통 GITHUB_REPOSITORY |
| track | 아니오 | 트랙 또는 스킬 이름 |
| runId | 예 | 이벤트 중복 방지를 위한 고유 실행 ID |

## 중요 사항

- started 와 completed 에 서로 다른 runId 를 사용해야 합니다.
- 같은 runId 를 다시 보내면 서버는 중복 이벤트로 처리합니다.
- username 은 서버에서 소문자로 정규화됩니다.

## 체크리스트

- 세션이 먼저 생성되었는가
- 시작 워크플로우에 started 이벤트가 들어갔는가
- 마지막 워크플로우에 completed 이벤트가 들어갔는가
- 두 이벤트가 서로 다른 runId 를 쓰는가
- continue-on-error: true 가 설정되었는가
