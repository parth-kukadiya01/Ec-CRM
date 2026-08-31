#!/bin/bash
# ============================================================
# CRM Admin Dashboard — Deployment Script
# Usage: bash deploy/deploy.sh
# ============================================================

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "============================================"
echo "  CRM Admin Dashboard — Deploying"
echo "============================================"

# ------ Pre-flight Checks ------
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found!"
    echo "Copy the template:  cp deploy/.env.production.example .env"
    echo "Then edit it:       nano .env"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker not installed. Run setup-ec2.sh first."
    exit 1
fi

# ------ Pull Latest Code ------
echo "[1/5] Pulling latest code..."
if [ -d ".git" ]; then
    git pull origin main || git pull origin master || echo "Git pull skipped (not a git repo or no remote)"
fi

# ------ Build Docker Images ------
echo "[2/5] Building Docker images..."
docker compose build --no-cache

# ------ Stop Old Containers ------
echo "[3/5] Stopping old containers..."
docker compose down --remove-orphans || true

# ------ Start Services ------
echo "[4/5] Starting services..."
docker compose up -d

# ------ Wait for Health Check ------
echo "[5/5] Waiting for services to become healthy..."
sleep 10

# Health check
MAX_RETRIES=12
RETRY_INTERVAL=5
for i in $(seq 1 $MAX_RETRIES); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo ""
        echo "============================================"
        echo "  Deployment Successful!"
        echo "============================================"
        echo ""
        echo "Services running:"
        docker compose ps
        echo ""
        echo "Health check: http://localhost/health"
        echo "API docs:     http://localhost/api/docs"
        echo "Frontend:     http://localhost/"
        echo ""
        exit 0
    fi
    echo "  Waiting... ($i/$MAX_RETRIES) — HTTP $HTTP_CODE"
    sleep $RETRY_INTERVAL
done

echo ""
echo "WARNING: Health check did not return 200 after ${MAX_RETRIES} retries."
echo "Check logs with: docker compose logs"
echo ""
docker compose ps
exit 1
