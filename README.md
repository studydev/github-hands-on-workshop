# GitHub Hands-on Workshop Tracker

GitHub Skills 워크숍 참가자의 실시간 진행 상황을 추적하고 리더보드를 보여주는 대시보드입니다.

![GitHub Skills Workshop](./images/workshop-hero-dark.png)

> **Dashboard:** https://github-skills.studydev.com
> **Self Study Map:** https://github-skills.studydev.com/presentation.html

## 아키텍처

```
                         ┌──────────────────────┐
                         │    GitHub Actions    │
                         │  (참가자 fork & 실습)   │
                         └──────────┬───────────┘
                                    │ POST /api/events
                                    ▼
┌──────────────────┐    ┌──────────────────────┐    ┌──────────────────┐
│  Static Web Apps │◀───│   Container Apps     │───▶│    Cosmos DB     │
│   (Dashboard)    │ SSE│   (Node.js API)      │    │     (NoSQL)      │
└──────────────────┘    └──────────────────────┘    └──────────────────┘
```

## 핵심 기능

### 대시보드

| 기능 | 설명 |
|------|------|
| 실시간 피드 | SSE로 이벤트 즉시 반영 |
| 포디움 | 완료 순 상위 10명 피라미드 표시 |
| 참가자 테이블 | 시작 → 단계별 → 완료 동적 컬럼 |
| 진행 현황 | 시작/완료/완료율 집계 |
| 이력 검색 | GitHub ID/Org별 요약·상세 이력 |
| 이벤트 추이 차트 | 7/14/30일 기간 선택, 모바일 반응형 |

### Self Study Map (presentation.html)

| 기능 | 설명 |
|------|------|
| impress.js 프레젠테이션 | 6개 카테고리 · 37개 모듈을 3D 슬라이드로 탐색 |
| 회전형 모듈 배치 | 같은 카테고리 내 모듈이 아크 형태로 회전하며 전개 |
| 학습자 조회 | GitHub ID/Org 입력 시 완료·진행 중·미시작 상태 표시 |
| 모든 코스 보기 | 전체 카테고리와 모듈을 한 화면 압축 보드로 탐색 |
| 이론 페이지 | 모듈별 impress.js 기반 이론 슬라이드 (learn/*.html) |
| 터치 디바이스 대응 | 태블릿에서 좌표·크기를 자동 조정한 impress 레이아웃 |

## 이벤트 모델

| 저장 type | 의미 |
|-----------|------|
| start | 실습 시작 |
| step | 중간 단계 통과 |
| end | 실습 완료 |

## 프로젝트 구조

```
backend/           Node.js/Express API
frontend/          Vanilla HTML/CSS/JS 대시보드
  ├─ index.html      대시보드 메인
  ├─ app.js          대시보드 로직 & 차트
  ├─ style.css       대시보드 스타일 (반응형 포함)
  ├─ presentation.*  Self Study Map (impress.js)
  └─ learn/          모듈별 이론 슬라이드
infra/             Azure 인프라 스크립트
docs/              아키텍처·통합 가이드
scripts/           테스트·데이터 유틸리티
```

## 배포

### 프론트엔드 (Static Web Apps)

```bash
SWA_TOKEN=$(az staticwebapp secrets list \
  --name workshop-tracker-web \
  --resource-group rg-workshop-tracker \
  --query "properties.apiKey" -o tsv)

swa deploy ./frontend --deployment-token "$SWA_TOKEN" --env production
```

### 백엔드 (Container Apps)

```bash
az acr build \
  --registry workshoptrackeracr \
  --resource-group rg-workshop-tracker \
  --image workshop-tracker-api:latest \
  ./backend

az containerapp update \
  --name workshop-tracker-api \
  --resource-group rg-workshop-tracker \
  --image workshoptrackeracr.azurecr.io/workshop-tracker-api:latest \
  --revision-suffix v$(date +%Y%m%d%H%M%S)
```

## 라이선스

MIT License
