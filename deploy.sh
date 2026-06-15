#!/usr/bin/env bash
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────────────
RUNTIME_NAME="signal"
FLAVOR="runtime-s2-general-2x4"
REGISTRY="vcr.vngcloud.vn"
REPO="111480-abp111970"
IMAGE_NAME="signal"
ENV_FILE=".env"
MIN_REPLICAS=1
MAX_REPLICAS=1
CPU_SCALE=50
MEM_SCALE=50
SKILLS_DIR=".claude/skills/agentbase/scripts"

# ─── Flags ────────────────────────────────────────────────────────────────────
FRESH_DB=false
for arg in "$@"; do
  case "$arg" in
    --fresh) FRESH_DB=true ;;
  esac
done

# ─── Helpers ──────────────────────────────────────────────────────────────────
log()  { echo "▶ $*"; }
ok()   { echo "✓ $*"; }
fail() { echo "✗ $*" >&2; exit 1; }

# ─── Step 1: IAM credentials ──────────────────────────────────────────────────
log "Checking IAM credentials..."
bash "$SKILLS_DIR/check_credentials.sh" iam || fail "IAM credentials not found. See /agentbase for setup."
ok "IAM credentials OK"

# ─── Step 2: Docker login to CR ───────────────────────────────────────────────
log "Logging in to AgentBase Container Registry..."
bash "$SKILLS_DIR/cr.sh" credentials docker-login
ok "Docker login OK"

# ─── Step 3: Backup live database ────────────────────────────────────────────
if [ "$FRESH_DB" = true ]; then
  log "Skipping backup — deploying with fresh database (--fresh)"
  : > seed.db
else
  log "Triggering database backup on live endpoint..."
  BACKUP_RESP=$(curl -sf -X POST "$LIVE_ENDPOINT/api/backup" \
    -H "Content-Type: application/json" \
    --max-time 60 || echo "")

  if echo "$BACKUP_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('ok') else 1)" 2>/dev/null; then
    ok "Backup created: $(echo "$BACKUP_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['backup'])")"

    log "Downloading backup as seed.db..."
    curl -sf "$LIVE_ENDPOINT/api/backup" \
      -H "Accept: application/octet-stream" \
      --max-time 120 \
      -o seed.db
    ok "seed.db ready ($(du -sh seed.db | cut -f1))"
  else
    log "Live endpoint not reachable or backup failed — using empty seed (fresh init on first boot)"
    : > seed.db
  fi
fi

# ─── Step 4: Generate image tag ──────────────────────────────────────────────
TAG="v$(date +%Y%m%d%H%M%S)"
FULL_IMAGE="$REGISTRY/$REPO/$IMAGE_NAME:$TAG"
log "Image tag: $FULL_IMAGE"

# ─── Step 5: Build ────────────────────────────────────────────────────────────
log "Building Next.js app locally..."
npm run build
ok "Next.js build complete"

log "Building Docker image for linux/amd64..."
docker buildx build --platform linux/amd64 --load -t "$FULL_IMAGE" .
ok "Build complete"

# ─── Step 5: Push ─────────────────────────────────────────────────────────────
log "Pushing image..."
docker push "$FULL_IMAGE"
ok "Push complete"

# ─── Step 6: Create or update runtime ─────────────────────────────────────────
log "Checking if runtime '$RUNTIME_NAME' already exists..."
LIST=$(bash "$SKILLS_DIR/runtime.sh" list)
RUNTIME_ID=$(echo "$LIST" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data.get('listData', []):
    if r['name'] == '$(echo $RUNTIME_NAME)':
        print(r['id'])
        break
" 2>/dev/null || true)

ENV_FLAG=""
if [ -f "$ENV_FILE" ]; then
  ENV_FLAG="--env-file $ENV_FILE"
fi

if [ -z "$RUNTIME_ID" ]; then
  log "Creating new runtime '$RUNTIME_NAME'..."
  RESPONSE=$(bash "$SKILLS_DIR/runtime.sh" create \
    --name "$RUNTIME_NAME" \
    --image "$FULL_IMAGE" \
    --flavor "$FLAVOR" \
    $ENV_FLAG \
    --min-replicas "$MIN_REPLICAS" \
    --max-replicas "$MAX_REPLICAS" \
    --cpu-scale "$CPU_SCALE" \
    --mem-scale "$MEM_SCALE" \
    --from-cr)
  RUNTIME_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  ok "Runtime created: $RUNTIME_ID"
else
  log "Updating existing runtime '$RUNTIME_NAME' ($RUNTIME_ID)..."
  bash "$SKILLS_DIR/runtime.sh" update "$RUNTIME_ID" \
    --image "$FULL_IMAGE" \
    --flavor "$FLAVOR" \
    $ENV_FLAG \
    --from-cr
  ok "Runtime updated: $RUNTIME_ID"
fi

# ─── Step 7: Wait for ACTIVE ──────────────────────────────────────────────────
log "Waiting for ACTIVE status..."
for i in $(seq 1 30); do
  STATUS=$(bash "$SKILLS_DIR/runtime.sh" get "$RUNTIME_ID" | \
    python3 -c "import sys,json; print(json.load(sys.stdin).get('status','UNKNOWN'))" 2>/dev/null)
  echo "  [$i/30] $STATUS"
  if [ "$STATUS" = "ACTIVE" ]; then break; fi
  if [ "$STATUS" = "ERROR" ];  then fail "Runtime entered ERROR state. Check the console."; fi
  sleep 10
done
[ "$STATUS" = "ACTIVE" ] || fail "Timed out waiting for ACTIVE status."
ok "Runtime is ACTIVE"

# ─── Step 8: Get endpoint URL ─────────────────────────────────────────────────
ENDPOINT_URL=$(bash "$SKILLS_DIR/runtime.sh" endpoints list "$RUNTIME_ID" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for ep in data.get('listData', []):
    if ep['name'] == 'DEFAULT':
        print(ep['url'])
        break
")

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Deployment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Runtime:   $RUNTIME_NAME"
echo " ID:        $RUNTIME_ID"
echo " Image:     $FULL_IMAGE"
echo " Endpoint:  $ENDPOINT_URL"
echo " Health:    $ENDPOINT_URL/health"
echo " Console:   https://aiplatform.console.vngcloud.vn/agent-runtime?tab=runtime"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
