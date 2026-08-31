#!/bin/bash
# ============================================================
# EC2 Initial Setup Script
# Run this ONCE after launching a fresh Ubuntu 22.04 EC2 instance
# Usage: sudo bash setup-ec2.sh
# ============================================================

set -euo pipefail

echo "============================================"
echo "  CRM Admin Dashboard — EC2 Setup"
echo "============================================"

# ------ System Updates ------
echo "[1/7] Updating system packages..."
apt-get update -y && apt-get upgrade -y

# ------ Install Docker ------
echo "[2/7] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    usermod -aG docker ubuntu
    systemctl enable docker
    systemctl start docker
    echo "Docker installed successfully."
else
    echo "Docker already installed."
fi

# ------ Install Docker Compose ------
echo "[3/7] Installing Docker Compose..."
if ! command -v docker compose &> /dev/null; then
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/')
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    echo "Docker Compose v${COMPOSE_VERSION} installed."
else
    echo "Docker Compose already installed."
fi

# ------ Install Git ------
echo "[4/7] Installing Git..."
apt-get install -y git

# ------ Install Certbot ------
echo "[5/7] Installing Certbot for SSL..."
apt-get install -y certbot

# ------ Setup Firewall ------
echo "[6/7] Configuring firewall (UFW)..."
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable
echo "Firewall configured: SSH(22), HTTP(80), HTTPS(443)"

# ------ Setup Swap (for t3.small with 2GB RAM) ------
echo "[7/7] Setting up 2GB swap space..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "vm.swappiness=10" >> /etc/sysctl.conf
    sysctl -p
    echo "Swap configured: 2GB"
else
    echo "Swap already exists."
fi

# ------ Create app directory ------
mkdir -p /var/www/certbot
mkdir -p /home/ubuntu/app

echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Clone your repo:  cd /home/ubuntu/app && git clone <your-repo-url> ."
echo "  2. Copy .env:        cp deploy/.env.production.example .env"
echo "  3. Edit .env:        nano .env  (fill in your secrets)"
echo "  4. Deploy:           bash deploy/deploy.sh"
echo "  5. SSL (after DNS):  sudo bash deploy/ssl-setup.sh YOUR_DOMAIN"
echo ""
echo "NOTE: Log out and log back in for docker group to take effect."
echo ""
