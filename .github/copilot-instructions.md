# GitHub Skills Workshop Dashboard — 프로젝트 가이드

## 프로젝트 구조

- **백엔드**: Node.js/Express → Azure Container Apps
- **프론트엔드**: Vanilla HTML/CSS/JS → Azure Static Web Apps
- **데이터베이스**: Azure Cosmos DB (Serverless, NoSQL)

## Azure 리소스 정보

| 리소스 | 이름 | 비고 |
|--------|------|------|
| Resource Group | `rg-workshop-tracker` | 리전: `koreacentral` |
| Cosmos DB Account | `workshop-tracker-cosmos` | DB: `workshop-tracker` |
| Container Registry | `workshoptrackeracr` | |
| Container App | `workshop-tracker-api` | 포트: 3000 |
| Static Web App | `workshop-tracker-web` | |
| API URL | `https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io` | |
| Frontend URL | `https://polite-glacier-0c5007800.1.azurestaticapps.net` | |

## 배포 방법

### 백엔드 배포 (Container Apps)

```bash
# 1. ACR에서 이미지 빌드
az acr build \
  --registry workshoptrackeracr \
  --resource-group rg-workshop-tracker \
  --image workshop-tracker-api:latest \
  ./backend

# 2. Container App 업데이트 (--revision-suffix로 새 리비전 강제 생성)
az containerapp update \
  --name workshop-tracker-api \
  --resource-group rg-workshop-tracker \
  --image workshoptrackeracr.azurecr.io/workshop-tracker-api:latest \
  --revision-suffix v$(date +%Y%m%d%H%M%S)
```

> **주의**: `--revision-suffix`를 지정하지 않으면 같은 `:latest` 태그라서 캐시된 이미지를 재사용할 수 있음. 반드시 고유한 suffix를 붙여야 새 이미지가 반영됨.

### 프론트엔드 배포 (Static Web Apps)

```bash
# SWA CLI 사용 (swa 설치: npm i -g @azure/static-web-apps-cli)
SWA_TOKEN=$(az staticwebapp secrets list \
  --name workshop-tracker-web \
  --resource-group rg-workshop-tracker \
  --query "properties.apiKey" -o tsv)

swa deploy ./frontend --deployment-token "$SWA_TOKEN" --env production
```

## Cosmos DB 컨테이너

| 컨테이너 | Partition Key | Unique Key |
|-----------|---------------|------------|
| `sessions` | `/id` | — |
| `events` | `/sessionId` | `/runId` |
