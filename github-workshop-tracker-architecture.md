# GitHub 워크샵 트래커 — 기술 설계 문서

---

## 1. 목표

GitHub Skills 기반 워크샵 진행 시, 참가자별 모듈 완료 현황을 실시간으로 수집하고 리더보드 대시보드로 시각화한다.

---

## 2. 왜 Referer가 아닌 GitHub Actions 환경변수인가

GitHub Skills 실습은 브라우저가 아니라 **GitHub Actions 서버(Runner)** 에서 자동 채점된다. 브라우저 기반 Referer 헤더는 전달되지 않는다. 대신 Actions 실행 환경에서 아래 변수가 자동 제공된다.

| 변수 | 예시 값 | 용도 |
|------|---------|------|
| `GITHUB_ACTOR` | `hyounsookim` | 참가자 식별 |
| `GITHUB_REPOSITORY` | `hyounsookim/intro-to-github` | 레포 및 org 확인 |
| `GITHUB_WORKFLOW` | `Step 1, Welcome` | 현재 모듈/단계 |
| `GITHUB_RUN_ID` | `12345678` | 중복 이벤트 방지 |

---

## 3. 전체 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│  참가자 GitHub Fork (1인 1 repo)                          │
│                                                          │
│  .github/workflows/check.yml                             │
│    ├── [기존] Skills 자동 채점 로직                        │
│    └── [추가] 완료 시 Tracker API 호출 (curl POST)         │
└──────────────────────────┬───────────────────────────────┘
                           │  POST /api/complete
                           │  { username, track, module, step }
                           ▼
┌──────────────────────────────────────────────────────────┐
│  Workshop Tracker Server                                 │
│                                                          │
│  ┌─────────────────┐   ┌──────────────────────────────┐ │
│  │  REST API        │   │  SQLite DB                   │ │
│  │  Node.js/Express │   │                              │ │
│  │                  │   │  events 테이블               │ │
│  │  POST /complete  │──▶│  - id, username, track       │ │
│  │  GET  /leaderboard│   │  - module, step, status      │ │
│  │  GET  /progress  │   │  - completed_at, repo        │ │
│  │  GET  /stream    │   └──────────────────────────────┘ │
│  └─────────────────┘                                     │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  실시간 대시보드 (HTML + SSE)                         │ │
│  │                                                      │ │
│  │  🏆 리더보드           📊 진행 그리드                 │ │
│  │  1위 김현수  ████  8/10  참가자 × 모듈 매트릭스       │ │
│  │  2위 이지은  ████  6/10  ✅완료 / 🔄진행 / ⬜미시작   │ │
│  │  3위 박민준  ███   4/10                              │ │
│  │                        🔔 실시간 피드                │ │
│  │                        "김현수 Module 3 완료!"       │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 4. 구성 요소별 상세 설계

### 4-1. GitHub Actions 트래킹 스텝

기존 Skills 워크플로우 완료 스텝 직후에 아래 한 블록을 추가한다.

```yaml
# .github/workflows/check.yml 에 추가
- name: Report completion to workshop tracker
  if: success()
  env:
    TRACKER_URL: ${{ secrets.WORKSHOP_TRACKER_URL }}
    API_KEY:     ${{ secrets.WORKSHOP_API_KEY }}
  run: |
    curl -s -X POST "$TRACKER_URL/api/complete" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{
        \"username\":     \"$GITHUB_ACTOR\",
        \"repo\":         \"$GITHUB_REPOSITORY\",
        \"track\":        \"Track 2\",
        \"module\":       \"Getting Started with GitHub Copilot\",
        \"step\":         1,
        \"run_id\":       \"$GITHUB_RUN_ID\",
        \"completed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
      }"
```

> 트랙명·모듈명은 각 Skills 레포 fork 시 워크플로우 파일에 하드코딩한다.
> 참가자가 수정할 수 없는 필드이므로 신뢰도 있는 데이터로 수집된다.

---

### 4-2. Tracker API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/api/complete` | Actions에서 완료 이벤트 수신 |
| `GET` | `/api/leaderboard` | 완료 수 기준 전체 순위 반환 |
| `GET` | `/api/progress` | 참가자 × 모듈 전체 그리드 |
| `GET` | `/api/progress/:username` | 특정 참가자 상세 진행 |
| `GET` | `/api/stream` | Server-Sent Events (실시간 푸시) |

**인증 방식:** `X-API-Key` 헤더 검증.
키는 워크샵 코디네이터가 발급하고 각 참가자 repo의 Secret에 등록.

---

### 4-3. DB 스키마 (SQLite)

```sql
-- 완료 이벤트 로그
CREATE TABLE events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT NOT NULL,
  repo         TEXT NOT NULL,
  track        TEXT NOT NULL,   -- "Track 2"
  module       TEXT NOT NULL,   -- "Getting Started with GitHub Copilot"
  step         INTEGER,
  run_id       TEXT UNIQUE,     -- 중복 이벤트 방지
  completed_at DATETIME NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 참가자 등록 (워크샵 시작 시 사전 등록)
CREATE TABLE participants (
  username      TEXT PRIMARY KEY,
  display_name  TEXT,
  track         TEXT,           -- 수강 트랙
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 4-4. 대시보드 UI 구성

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Workshop Tracker              [Track 2 ▼] [전체 ▼] │
├────────────────────────┬────────────────────────────────────┤
│  🏆 실시간 리더보드      │  📋 모듈별 진행 현황               │
│                        │                                    │
│  # | 참가자  | 완료 | % │  모듈          |완료|진행|미시작   │
│  1 | 김현수  |  8  |80%│  Module 1 ████ | 12 |  3 |  0     │
│  2 | 이지은  |  6  |60%│  Module 2 ███░ |  9 |  4 |  2     │
│  3 | 박민준  |  4  |40%│  Module 3 ██░░ |  6 |  5 |  4     │
│  4 | 최수진  |  3  |30%│  Module 4 █░░░ |  3 |  2 |  10    │
│                        │  Module 5 ░░░░ |  0 |  1 |  14    │
├────────────────────────┴────────────────────────────────────┤
│  🔔 실시간 피드                                              │
│  ✅ 14:32  김현수님이 [Module 3 - AI 동료 길들이기] 완료!    │
│  ✅ 14:28  이지은님이 [Module 2 - AI 동료 첫 출근] 완료!     │
│  ✅ 14:21  박민준님이 [Module 1 - AI 동료 고용하기] 완료!    │
└─────────────────────────────────────────────────────────────┘
```

**업데이트 방식:** Server-Sent Events (SSE).
브라우저가 `/api/stream` 구독 → 서버가 새 이벤트 수신 시 연결된 모든 클라이언트에 푸시. 폴링 불필요.

---

## 5. 배포 옵션 비교

| 방식 | 비용 | 설정 난이도 | 적합 규모 |
|------|------|------------|---------|
| **GitHub Codespaces** | 무료 (일정 시간) | 낮음 | 1회성 이벤트 |
| **Vercel (서버리스)** | 무료 티어 있음 | 중간 | 소규모 (~50명) |
| **Azure App Service** | 유료 | 낮음 | 반복 운영 워크샵 |
| **Azure Container Apps** | 사용량 기반 | 중간 | 대규모 (~200명+) |

---

## 6. 구현 순서 (추천)

```
Week 1
  ├── [1일] Tracker API 서버 (Node.js + SQLite)
  ├── [1일] 실시간 대시보드 (HTML + SSE)
  └── [0.5일] GitHub Actions 스텝 템플릿 작성

Week 2
  ├── [0.5일] 트랙별 Skills repo fork + 워크플로우 패치
  ├── [0.5일] 참가자 초대 및 Secret 등록 자동화 스크립트
  └── [0.5일] 테스트 및 배포
```

---

## 7. 보안 고려사항

| 위협 | 대응 |
|------|------|
| API Key 노출 | GitHub Secret으로만 저장, 로그 출력 금지 |
| 이벤트 위조 | `run_id` UNIQUE 제약으로 중복 이벤트 차단 |
| 점수 조작 | `GITHUB_ACTOR`는 Actions 환경에서 변조 불가 |
| CORS 오용 | `/api/stream` 외 브라우저 직접 호출 차단 |
