# GitHub Hands-on Workshop Tracker

GitHub Skills 기반 핸즈온 워크숍에서 참가자의 시작과 완료 이벤트를 실시간으로 수집하고, 먼저 완료한 순서대로 리더보드를 보여주는 대시보드입니다.

## 배포 주소

- Dashboard: https://polite-glacier-0c5007800.1.azurestaticapps.net
- API: https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io

## 핵심 기능

- 세션 생성: 교육 회차별로 세션을 만들고 트랙, 시작일, 종료일을 관리
- 실시간 피드: started, completed 이벤트를 SSE로 즉시 반영
- 포디움 리더보드: 완료 시각 기준 상위 3명을 포디움 형태로 표시
- 진행 현황: 시작 인원, 완료 인원, 완료율을 세션 단위로 집계
- Zero Config 학생 경험: 학생은 fork와 과제 완료만 수행하면 됨

## 아키텍처

```text
GitHub Actions
  -> Azure Container Apps API
  -> Azure Cosmos DB

Azure Static Web Apps Dashboard
  -> API polling + SSE subscription
```

## 이벤트 모델

이 프로젝트는 중간 step을 추적하지 않습니다. 아래 두 이벤트만 처리합니다.

| type | 의미 |
| --- | --- |
| started | 학생이 실습을 시작함 |
| completed | 학생이 실습을 끝냄 |

이벤트는 POST /api/events 로 수집되며, username 기준으로 세션 통계와 리더보드를 계산합니다.

## 빠른 시작

### 1. 세션 생성

대시보드에서 세션 이름, 트랙, 시작일, 종료일을 입력해 세션을 생성합니다.

### 2. GitHub Actions에 시작 이벤트 추가

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

### 3. GitHub Actions에 완료 이벤트 추가

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

시작과 완료 이벤트는 서로 다른 runId를 사용해야 중복 키 충돌을 피할 수 있습니다.

## API

| Method | Path | 설명 |
| --- | --- | --- |
| GET | /api/health | 헬스 체크 |
| POST | /api/sessions | 세션 생성 |
| GET | /api/sessions | 세션 목록 |
| GET | /api/sessions/:sessionId | 세션 상세 및 통계 |
| POST | /api/events | 시작, 완료 이벤트 수집 |
| GET | /api/sessions/:sessionId/leaderboard | 완료 순위와 참가자 목록 조회 |
| GET | /api/stream?sessionId=... | 세션별 실시간 이벤트 스트림 |

## 로컬 실행

```bash
cd backend
npm install
export COSMOS_ENDPOINT="https://your-cosmos.documents.azure.com:443/"
export COSMOS_KEY="your-key"
npm run dev
```

```bash
cd frontend
python3 -m http.server 8080
```

프론트엔드는 frontend/app.js 의 API_BASE 값을 사용합니다.

## 기술 스택

| 구성 요소 | 기술 |
| --- | --- |
| Backend | Node.js 18+, Express |
| Database | Azure Cosmos DB NoSQL Serverless |
| Backend Hosting | Azure Container Apps |
| Frontend | HTML, CSS, Vanilla JavaScript |
| Frontend Hosting | Azure Static Web Apps |

## 프로젝트 구조

```text
backend/
frontend/
docs/
infra/
PLAN.md
README.md
LICENSE
CODE_OF_CONDUCT.md
```

## 문서

- 전체 계획: PLAN.md
- 워크플로우 연동 가이드: docs/skills-integration-guide.md

## 라이선스

MIT License를 따릅니다.

## 행동 강령

Microsoft Open Source Code of Conduct를 따릅니다.
