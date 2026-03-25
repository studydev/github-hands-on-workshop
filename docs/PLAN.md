# GitHub Hands-on Workshop Tracker Plan

## 목표

GitHub Skills 기반 교육에서 참가자가 언제 시작했고 누가 먼저 끝냈는지를 공개 대시보드로 확인할 수 있게 한다.

핵심 목표는 아래와 같다.

- 강사는 세션만 만들면 된다
- 학생은 추가 설정 없이 워크숍을 진행한다
- 대시보드는 실시간으로 반영된다
- 리더보드는 완료 시각 기준으로 단순하고 명확해야 한다

## 현재 범위

현재 구현은 step 단위 추적이 아니라 이벤트 단위 추적이다.

- started: 실습 시작
- completed: 실습 완료

중간 단계는 저장하지 않는다. 완료율은 세션 내 started 사용자 대비 completed 사용자 비율로 계산한다.

## 시스템 구성

```text
GitHub Actions
  -> POST /api/events
  -> Azure Container Apps
  -> Azure Cosmos DB

Azure Static Web Apps
  -> GET /api/sessions
  -> GET /api/sessions/:sessionId
  -> GET /api/sessions/:sessionId/leaderboard
  -> GET /api/stream?sessionId=...
```

## 설계 원칙

| 원칙 | 설명 |
| --- | --- |
| Zero Config for students | 학생은 fork 및 과제 완료 외에 아무 설정도 하지 않음 |
| Public dashboard | 인증 없이 누구나 현황을 볼 수 있음 |
| Minimal event model | started, completed 두 이벤트만 저장 |
| Real-time UX | SSE로 새 이벤트를 즉시 반영 |
| Session-based management | 동시에 여러 교육 회차를 운영 가능 |

## 백엔드 설계

백엔드는 Express 기반 API로 구성된다.

- 세션 관리: 생성, 목록, 상세 조회
- 이벤트 수집: GitHub Actions에서 POST /api/events 호출
- 리더보드 계산: 완료 사용자만 완료 시각 오름차순 정렬
- SSE 브로드캐스트: 새 이벤트를 연결된 대시보드에 전달

## 데이터 모델

### sessions 컨테이너

파티션 키는 /id 이다.

```json
{
  "id": "fe72e72d",
  "name": "GitHub Pages Workshop",
  "track": "github-pages",
  "startDate": "2026-03-24T03:00:00.000Z",
  "endDate": "2026-03-24T06:00:00.000Z",
  "createdAt": "2026-03-24T02:50:00.000Z"
}
```

### events 컨테이너

파티션 키는 /sessionId 이고, /runId 는 유니크 키다.

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

## 프론트엔드 설계

- 세션 드롭다운으로 활성 세션 선택
- 세션 생성 모달에서 이름, 트랙, 시작일, 종료일 입력
- 상단 통계 카드로 started, completed, completionRate 표시
- 포디움 카드로 상위 3명 강조
- 참가자 테이블로 전체 상태 표시
- 실시간 피드로 started, completed 메시지 누적

## Azure 배포 현황

| 리소스 | 값 |
| --- | --- |
| Resource Group | rg-workshop-tracker |
| Cosmos DB | workshop-tracker-cosmos |
| Azure Container Apps API | workshop-tracker-api |
| API URL | https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io |
| Static Web App | workshop-tracker-web |
| Dashboard URL | https://polite-glacier-0c5007800.1.azurestaticapps.net |

## 운영 흐름

1. 강사가 대시보드에서 세션을 만든다.
2. 생성된 sessionId 를 GitHub Actions 워크플로우에 넣는다.
3. 학생이 시작 시 started 이벤트가 적재된다.
4. 학생이 마지막 과제를 끝내면 completed 이벤트가 적재된다.
5. 대시보드가 SSE 또는 재조회로 리더보드를 갱신한다.

## 후속 개선 후보

- 세션 보관 정책과 오래된 이벤트 정리
- 트랙별 템플릿 스니펫 자동 생성 개선
- 운영자용 세션 종료, 아카이브 기능
- 대시보드 정렬 및 필터 기능 확장
- API 관측성 강화와 오류 분석 대시보드 추가
