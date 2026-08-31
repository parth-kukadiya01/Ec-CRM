#!/bin/bash
# ============================================================
# CRM Admin Dashboard — Native Deployment Script (No Docker)
# Deploys directly with systemd, Nginx, Python venv, Node.js
# Usage: bash deploy/deploy-native.sh
# ============================================================

set -euo pipefail

APP_DIR="/home/ubuntu/app"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

echo "============================================"
echo "  CRM Admin Dashboard — Native Deploy"
echo "============================================"

# ------ Pre-flight Checks ------
if [ ! -f "$APP_DIR/.env" ]; then
    echo "ERROR: $APP_DIR/.env file not found!"
    echo "Copy the template:  cp deploy/.env.production.example .env"
    exit 1
fi

# Source env vars
set -a
source "$APP_DIR/.env"
set +a

# ------ Backend Setup ------
echo "[1/6] Setting up Python backend..."
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "Created Python venv"
fi

source venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
deactivate

echo "Backend dependencies installed."

# ------ Create backend .env ------
echo "[2/6] Writing backend .env..."
cat > "$BACKEND_DIR/.env" << ENVEOF
PROJECT_NAME="${PROJECT_NAME:-CRM System}"
ENVIRONMENT=${ENVIRONMENT:-production}
SECRET_KEY=${SECRET_KEY}
ALGORITHM=${ALGORITHM:-HS256}
ACCESS_TOKEN_EXPIRE_MINUTES=${ACCESS_TOKEN_EXPIRE_MINUTES:-10080}
DATABASE_URL=postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB:-crm_project}
CORS_ORIGINS=${CORS_ORIGINS:-*}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}
AWS_REGION=${AWS_REGION:-ap-south-1}
S3_BUCKET_NAME=${S3_BUCKET_NAME:-}
S3_CDN_DOMAIN=${S3_CDN_DOMAIN:-}
ENVEOF

echo "Backend .env written."

# ------ Frontend Setup ------
echo "[3/6] Setting up Next.js frontend..."
cd "$FRONTEND_DIR"

npm ci --silent 2>/dev/null || npm install --silent

# Build frontend
echo "[4/6] Building frontend..."
NEXT_PUBLIC_API_URL="" npm run build

echo "Frontend built."

# ------ Create systemd service: Backend ------
echo "[5/6] Creating systemd services..."

sudo tee /etc/systemd/system/crm-backend.service > /dev/null << SVCEOF
[Unit]
Description=CRM Backend (FastAPI + Uvicorn)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=$BACKEND_DIR
EnvironmentFile=$BACKEND_DIR/.env
ExecStart=$BACKEND_DIR/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

# ------ Create systemd service: Frontend ------
sudo tee /etc/systemd/system/crm-frontend.service > /dev/null << SVCEOF
[Unit]
Description=CRM Frontend (Next.js)
After=network.target crm-backend.service

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=$FRONTEND_DIR
Environment=NODE_ENV=production
Environment=INTERNAL_BACKEND_URL=http://127.0.0.1:8000
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

# ------ Enable and Start Services ------
echo "[6/6] Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable crm-backend crm-frontend
sudo systemctl restart crm-backend
sleep 3
sudo systemctl restart crm-frontend
sleep 3

# ------ Verify ------
echo ""
echo "=== Service Status ==="
sudo systemctl status crm-backend --no-pager -l | head -15
echo ""
sudo systemctl status crm-frontend --no-pager -l | head -15

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "Backend:  http://127.0.0.1:8000/health"
echo "Frontend: http://127.0.0.1:3000"
echo "Nginx:    http://$(curl -s ifconfig.me)"
echo ""
echo "Logs:"
echo "  sudo journalctl -u crm-backend -f"
echo "  sudo journalctl -u crm-frontend -f"
echo ""
