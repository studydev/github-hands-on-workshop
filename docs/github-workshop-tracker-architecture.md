# GitHub Skills Workshop Dashboard 기술 설계 문서

## 1. 목표

GitHub Skills 기반 워크숍에서 참가자의 실습 시작과 완료를 실시간으로 수집하고, 완료 시각 기준 리더보드와 세션 진행률을 대시보드로 제공한다.

## 2. 설계 방향

현재 시스템은 step 기반 추적이 아니라 이벤트 기반 추적을 사용한다.

- started: 참가자가 실습을 시작함
- completed: 참가자가 실습을 끝냄

중간 단계는 관리하지 않는다. 이렇게 하면 강사가 세션만 만들면 되고, 학생은 별도 설정 없이 워크플로우 실행만으로 집계된다.

## 3. 전체 아키텍처

```text
GitHub Skills Workflow
  -> POST /api/events
  -> Azure Container Apps API
  -> Azure Cosmos DB

Azure Static Web Apps Dashboard
  -> GET /api/sessions
  -> GET /api/sessions/:sessionId
  -> GET /api/sessions/:sessionId/leaderboard
  -> GET /api/stream?sessionId=...
```

## 4. GitHub Actions 연동 원칙

GitHub Actions 러너는 아래 값을 기본 제공한다.

| 변수 | 용도 |
| --- | --- |
| GITHUB_ACTOR | 참가자 식별 |
| GITHUB_REPOSITORY | 포크 저장소 식별 |
| GITHUB_RUN_ID | 이벤트 중복 방지 |

학생이 직접 값을 입력하지 않게 하고, 강사가 템플릿 워크플로우에 sessionId 와 track 만 설정한다.

## 5. 워크플로우 예시

### 시작 이벤트

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

### 완료 이벤트

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

## 6. API 구조

| Method | Path | 설명 |
| --- | --- | --- |
| POST | /api/sessions | 세션 생성 |
| GET | /api/sessions | 세션 목록 |
| GET | /api/sessions/:sessionId | 세션 정보와 통계 조회 |
| POST | /api/events | started, completed 이벤트 수신 |
| GET | /api/sessions/:sessionId/leaderboard | 완료 순위와 참가자 목록 조회 |
| GET | /api/stream?sessionId=... | SSE 실시간 스트림 |
| GET | /api/health | 헬스 체크 |

## 7. 데이터 저장 구조

Azure Cosmos DB NoSQL 을 사용한다.

### sessions 컨테이너

- 파티션 키: /id
- 문서 예시:

```json
{
  "id": "fe72e72d",
  "name": "A 고객사 GitHub Pages 교육",
  "track": "github-pages",
  "startDate": "2026-03-24T03:00:00.000Z",
  "endDate": "2026-03-24T06:00:00.000Z",
  "createdAt": "2026-03-24T02:50:00.000Z"
}
```

### events 컨테이너

- 파티션 키: /sessionId
- 고유 키: /runId
- 문서 예시:

```json
{
  "id": "uuid",
  "sessionId": "fe72e72d",
  "runId": "complete-12345678",
  "type": "completed",
  "username": "octocat",
  "repo": "octocat/skills-github-pages",
  "track": "github-pages",
  "timestamp": "2026-03-24T03:10:00.000Z"
}
```

## 8. 대시보드 구성

- 세션 선택 드롭다운
- 세션 생성 모달
- 시작 인원, 완료 인원, 완료율 카드
- 포디움 리더보드 상위 3명
- 전체 참가자 테이블
- 실시간 피드
- 종료 시각 카운트다운

리더보드는 completed 이벤트가 기록된 참가자만 대상으로 하며, timestamp 오름차순으로 순위를 계산한다.

## 9. 배포 구성

| 구성 요소 | 배포 대상 |
| --- | --- |
| API | Azure Container Apps |
| 데이터 저장소 | Azure Cosmos DB Serverless |
| 프론트엔드 | Azure Static Web Apps |

현재 배포 엔드포인트는 다음과 같다.

- Dashboard: https://polite-glacier-0c5007800.1.azurestaticapps.net
- API: https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io

## 10. 운영상 고려사항

- runId 유니크 제약으로 중복 이벤트를 차단한다.
- username 은 서버에서 소문자로 정규화한다.
- started 대비 completed 비율로 완료율을 계산한다.
- 세션별 조회를 우선해 불필요한 교차 파티션 탐색을 줄인다.
- 대시보드는 인증 없이 공개되므로 민감한 정보는 저장하지 않는다.
