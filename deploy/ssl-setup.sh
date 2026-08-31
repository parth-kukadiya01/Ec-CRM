#!/bin/bash
# ============================================================
# Let's Encrypt SSL Setup Script
# Usage: sudo bash deploy/ssl-setup.sh YOUR_DOMAIN
# Example: sudo bash deploy/ssl-setup.sh crm.example.com
# ============================================================

set -euo pipefail

if [ $# -eq 0 ]; then
    echo "Usage: sudo bash deploy/ssl-setup.sh YOUR_DOMAIN"
    echo "Example: sudo bash deploy/ssl-setup.sh crm.example.com"
    exit 1
fi

DOMAIN=$1
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NGINX_CONF="$APP_DIR/nginx/nginx.conf"

echo "============================================"
echo "  SSL Setup for: $DOMAIN"
echo "============================================"

# ------ Step 1: Obtain Certificate ------
echo "[1/4] Obtaining SSL certificate from Let's Encrypt..."
certbot certonly \
    --standalone \
    --preferred-challenges http \
    --agree-tos \
    --no-eff-email \
    --email admin@${DOMAIN} \
    -d ${DOMAIN} \
    --pre-hook "docker compose -f $APP_DIR/docker-compose.yml stop nginx || true" \
    --post-hook "docker compose -f $APP_DIR/docker-compose.yml start nginx || true"

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to obtain SSL certificate."
    echo "Make sure your domain DNS A record points to this server's IP."
    exit 1
fi

echo "[2/4] SSL certificate obtained successfully!"

# ------ Step 2: Update Nginx Config ------
echo "[3/4] Updating Nginx configuration for HTTPS..."

# Enable HTTP → HTTPS redirect
sed -i "s|# return 301 https://\$host\$request_uri;|return 301 https://\$host\$request_uri;|g" "$NGINX_CONF"

# Uncomment the HTTPS server block
sed -i "s|# server {|server {|g" "$NGINX_CONF"
sed -i "s|#     listen 443|    listen 443|g" "$NGINX_CONF"
sed -i "s|YOUR_DOMAIN|${DOMAIN}|g" "$NGINX_CONF"

# Uncomment all lines in the HTTPS block (lines starting with #     or #})
# Using a simpler approach: remove leading '# ' from the commented HTTPS block
cd "$APP_DIR"

# Create a Python script to properly uncomment the HTTPS block
python3 - "$NGINX_CONF" "$DOMAIN" << 'PYTHON_SCRIPT'
import sys

conf_path = sys.argv[1]
domain = sys.argv[2]

with open(conf_path, 'r') as f:
    content = f.read()

# Replace YOUR_DOMAIN with actual domain
content = content.replace('YOUR_DOMAIN', domain)

# Find and uncomment the HTTPS server block
# Look for the commented block between the markers
lines = content.split('\n')
in_https_block = False
new_lines = []
for line in lines:
    if 'HTTPS server block' in line and 'Uncomment' in line:
        in_https_block = True
        new_lines.append(line)
        continue
    
    if in_https_block:
        if line.startswith('# }') and not line.startswith('# }'):
            new_lines.append(line[2:])  # Remove '# '
            in_https_block = False
            continue
        if line.startswith('#     ') or line.startswith('#   ') or line.startswith('# '):
            # Remove the leading '# '
            if line.startswith('#     '):
                new_lines.append(line[2:])
            elif line.startswith('#   '):
                new_lines.append(line[2:])
            elif line.startswith('# '):
                new_lines.append(line[2:])
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

with open(conf_path, 'w') as f:
    f.write('\n'.join(new_lines))

print(f"Nginx config updated for domain: {domain}")
PYTHON_SCRIPT

# ------ Step 3: Restart Nginx ------
echo "[4/4] Restarting Nginx with SSL..."
cd "$APP_DIR"
docker compose restart nginx

# ------ Step 4: Setup Auto-Renewal ------
echo "Setting up auto-renewal cron job..."
CRON_CMD="0 2 * * * certbot renew --quiet --post-hook 'docker compose -f $APP_DIR/docker-compose.yml restart nginx'"
(crontab -l 2>/dev/null || true; echo "$CRON_CMD") | sort -u | crontab -

echo ""
echo "============================================"
echo "  SSL Setup Complete!"
echo "============================================"
echo ""
echo "Your site is now accessible at:"
echo "  https://${DOMAIN}"
echo ""
echo "SSL auto-renewal is configured (runs daily at 2 AM)."
echo "Test renewal with: sudo certbot renew --dry-run"
echo ""
