# GitHub Hands-on Workshop Tracker

GitHub Skills 워크숍 참가자의 실시간 진행 상황을 추적하고 리더보드를 보여주는 대시보드입니다.

![image](./images/image.png)

> Dashboard: https://github-skills.studydev.com

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

| 기능 | 설명 |
|------|------|
| 실시간 피드 | SSE로 이벤트 즉시 반영 |
| 포디움 | 완료 순 상위 10명 피라미드 표시 |
| 참가자 테이블 | 시작 → 단계별 → 완료 동적 컬럼 |
| 진행 현황 | 시작/완료/완료율 집계 |
| 이력 검색 | GitHub ID/Org별 요약·상세 이력 |

## 이벤트 모델

| 저장 type | 의미 |
|-----------|------|
| start | 실습 시작 |
| step | 중간 단계 통과 |
| end | 실습 완료 |

## 프로젝트 구조

```
backend/       Node.js/Express API
frontend/      Vanilla HTML/CSS/JS 대시보드
infra/         Azure 인프라 스크립트
docs/          아키텍처·통합 가이드
scripts/       테스트·데이터 유틸리티
```

## 라이선스

MIT License
