#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# GitHub Workshop Tracker — Azure 인프라 프로비저닝 스크립트
# ============================================================
# 사용법:
#   chmod +x infra/deploy.sh
#   ./infra/deploy.sh
#
# 사전 요구사항:
#   - Azure CLI (az) 로그인 완료: az login
#   - Docker (컨테이너 이미지 빌드/푸시 시 필요)
# ============================================================

# --- 설정 (필요에 따라 수정) ---
RESOURCE_GROUP="rg-workshop-tracker"
LOCATION="koreacentral"
COSMOS_ACCOUNT="workshop-tracker-cosmos"
COSMOS_DB="workshop-tracker"
ACR_NAME="workshoptrackeracr"   # Azure Container Registry (소문자, 숫자만)
ACA_ENV="workshop-tracker-env"
ACA_APP="workshop-tracker-api"
SWA_NAME="workshop-tracker-dashboard"

echo "=== 1. 리소스 그룹 생성 ==="
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

echo "=== 2. Cosmos DB 계정 생성 (Serverless) ==="
az cosmosdb create \
  --name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --kind GlobalDocumentDB \
  --capabilities EnableServerless \
  --default-consistency-level Session \
  --locations regionName="$LOCATION"

echo "=== 3. Cosmos DB 데이터베이스 생성 ==="
az cosmosdb sql database create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$COSMOS_DB"

echo "=== 4. Cosmos DB 컨테이너 생성 ==="
# sessions 컨테이너
az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --database-name "$COSMOS_DB" \
  --name "sessions" \
  --partition-key-path "/id"

# events 컨테이너 (unique key: /runId)
az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --database-name "$COSMOS_DB" \
  --name "events" \
  --partition-key-path "/sessionId" \
  --unique-key-policy '{"uniqueKeys":[{"paths":["/runId"]}]}'

echo "=== 5. Cosmos DB 연결 정보 조회 ==="
COSMOS_ENDPOINT=$(az cosmosdb show \
  --name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query documentEndpoint -o tsv)

COSMOS_KEY=$(az cosmosdb keys list \
  --name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query primaryMasterKey -o tsv)

echo "  Endpoint: $COSMOS_ENDPOINT"
echo "  Key: ***${COSMOS_KEY: -4}"

echo "=== 6. Azure Container Registry 생성 ==="
az acr create \
  --name "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --sku Basic \
  --admin-enabled true

echo "=== 7. 백엔드 Docker 이미지 빌드 & 푸시 ==="
az acr build \
  --registry "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image workshop-tracker-api:latest \
  --file backend/Dockerfile \
  backend/

echo "=== 8. Container Apps 환경 생성 ==="
az containerapp env create \
  --name "$ACA_ENV" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION"

echo "=== 9. Container Apps 앱 생성 ==="
ACR_SERVER=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query loginServer -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query "passwords[0].value" -o tsv)

az containerapp create \
  --name "$ACA_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ACA_ENV" \
  --image "${ACR_SERVER}/workshop-tracker-api:latest" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --env-vars \
    "COSMOS_ENDPOINT=$COSMOS_ENDPOINT" \
    "COSMOS_KEY=$COSMOS_KEY"

ACA_URL=$(az containerapp show \
  --name "$ACA_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

echo ""
echo "=== 10. Static Web Apps 생성 ==="
echo "  Static Web Apps는 Azure Portal 또는 GitHub 연동으로 배포하세요."
echo "  프론트엔드 소스: frontend/"
echo "  빌드 없이 정적 파일 배포 (Output location: /)"
echo ""
echo "  또는 Azure CLI로 생성:"
echo "  az staticwebapp create \\"
echo "    --name $SWA_NAME \\"
echo "    --resource-group $RESOURCE_GROUP \\"
echo "    --location $LOCATION"
echo ""
echo "=========================================="
echo "  배포 완료!"
echo "=========================================="
echo "  API URL:   https://$ACA_URL"
echo "  Cosmos DB: $COSMOS_ENDPOINT"
echo ""
echo "  프론트엔드의 app.js에서 API_BASE를 설정하세요:"
echo "  window.API_BASE = 'https://$ACA_URL'"
echo "=========================================="
