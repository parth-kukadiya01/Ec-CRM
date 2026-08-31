# AWS Setup Guide — CRM Admin Dashboard

Complete step-by-step guide to deploy the CRM Admin Dashboard on AWS EC2 with S3 image storage and HTTPS.

---

## Prerequisites

- An AWS account
- A registered domain name (e.g., `crm.yourdomain.com`)
- SSH client (Terminal on Mac/Linux, PuTTY on Windows)

---

## Step 1: Create an EC2 Instance

### 1.1 Launch Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Configure:
   - **Name**: `CRM-Dashboard`
   - **AMI**: Ubuntu Server 22.04 LTS (64-bit x86)
   - **Instance type**: `t3.small` (2 vCPU, 2 GB RAM)
   - **Key pair**: Create new or select existing (download the `.pem` file)
   - **Network settings**:
     - Allow SSH traffic from **My IP**
     - Allow HTTP traffic from **Anywhere**
     - Allow HTTPS traffic from **Anywhere**
   - **Storage**: 20 GB gp3

3. Click **Launch Instance**

### 1.2 Create Security Group Rules

If not set during launch, go to **EC2 → Security Groups** and add:

| Type   | Protocol | Port | Source      | Description      |
|--------|----------|------|-------------|------------------|
| SSH    | TCP      | 22   | My IP       | SSH Access       |
| HTTP   | TCP      | 80   | 0.0.0.0/0   | Web Traffic      |
| HTTPS  | TCP      | 443  | 0.0.0.0/0   | Secure Traffic   |

### 1.3 Allocate Elastic IP

1. Go to **EC2 → Elastic IPs → Allocate Elastic IP address**
2. Click **Allocate**
3. Select the new IP → **Actions → Associate Elastic IP address**
4. Select your EC2 instance → **Associate**

> **Note down your Elastic IP** — you'll need it for DNS setup.

### 1.4 Connect via SSH

```bash
# Set permissions on key file
chmod 400 your-key.pem

# Connect to EC2
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
```

---

## Step 2: Create S3 Bucket

### 2.1 Create Bucket

1. Go to **AWS Console → S3 → Create Bucket**
2. Configure:
   - **Bucket name**: `crm-dashboard-uploads` (must be globally unique, add your account suffix)
   - **Region**: Same as your EC2 (e.g., `ap-south-1`)
   - **Object Ownership**: ACLs disabled
   - **Block Public Access**: **Uncheck** "Block all public access" (we need public read for images)
     - Check the acknowledgement box
   - Leave everything else default
3. Click **Create Bucket**

### 2.2 Set Bucket Policy (Public Read)

1. Go to your bucket → **Permissions** tab → **Bucket Policy** → Edit
2. Paste this policy (replace `YOUR_BUCKET_NAME`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadForUploads",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/uploads/*"
        }
    ]
}
```

3. Click **Save changes**

### 2.3 Set CORS Configuration

1. Go to your bucket → **Permissions** tab → **CORS** → Edit
2. Paste:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3600
    }
]
```

3. Click **Save changes**

---

## Step 3: Create IAM User for S3 Access

### 3.1 Create IAM User

1. Go to **AWS Console → IAM → Users → Create User**
2. User name: `crm-s3-uploader`
3. Click **Next**
4. Select **Attach policies directly**
5. Click **Create policy** and use this JSON:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET_NAME",
                "arn:aws:s3:::YOUR_BUCKET_NAME/*"
            ]
        }
    ]
}
```

6. Name the policy: `CRM-S3-Upload-Policy`
7. Go back and attach this policy to the user
8. Click **Create User**

### 3.2 Generate Access Keys

1. Go to the new user → **Security credentials** tab
2. Click **Create access key**
3. Select **Application running outside AWS**
4. Click **Create access key**
5. **Copy and save** both:
   - Access Key ID (starts with `AKIA...`)
   - Secret Access Key

> ⚠️ **Save these immediately!** The secret key is only shown once.

---

## Step 4: Setup DNS

### 4.1 Point Domain to EC2

In your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):

1. Add an **A Record**:
   - **Host/Name**: `crm` (or `@` for root domain)
   - **Value**: Your EC2 Elastic IP
   - **TTL**: 300 (5 minutes)

2. Wait for DNS propagation (5-30 minutes)

3. Verify:
```bash
# Check DNS propagation
nslookup crm.yourdomain.com
# or
dig crm.yourdomain.com
```

---

## Step 5: Deploy the Application

### 5.1 Initial Server Setup

SSH into your EC2 instance and run:

```bash
# Clone the repository
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/admin-dashboard.git app
cd app

# Run the setup script
sudo bash deploy/setup-ec2.sh

# Log out and back in (for docker group)
exit
```

SSH back in:

```bash
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
cd /home/ubuntu/app
```

### 5.2 Configure Environment

```bash
# Copy the production env template
cp deploy/.env.production.example .env

# Edit with your values
nano .env
```

Fill in these values in `.env`:

```bash
SECRET_KEY=<generate with: openssl rand -hex 32>
POSTGRES_PASSWORD=<strong password>
AWS_ACCESS_KEY_ID=<from Step 3.2>
AWS_SECRET_ACCESS_KEY=<from Step 3.2>
AWS_REGION=ap-south-1
S3_BUCKET_NAME=crm-dashboard-uploads
```

### 5.3 Deploy

```bash
bash deploy/deploy.sh
```

This will:
1. Build all Docker images (frontend, backend, nginx, postgres)
2. Start all services
3. Run health checks

### 5.4 Verify

```bash
# Check all containers are running
docker compose ps

# Check health endpoint
curl http://localhost/health

# Check logs if needed
docker compose logs backend
docker compose logs frontend
docker compose logs nginx
```

Visit `http://YOUR_ELASTIC_IP` in your browser — you should see the CRM login page.

---

## Step 6: Setup SSL (HTTPS)

> **Prerequisite**: DNS must be pointing to your EC2 IP (Step 4)

```bash
# Run the SSL setup script
sudo bash deploy/ssl-setup.sh crm.yourdomain.com
```

This will:
1. Obtain a free SSL certificate from Let's Encrypt
2. Configure Nginx for HTTPS
3. Set up automatic renewal (daily at 2 AM)

Verify: Visit `https://crm.yourdomain.com`

---

## Maintenance Commands

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
docker compose logs -f postgres
```

### Restart Services
```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
```

### Update Application
```bash
# Pull latest code and redeploy
bash deploy/deploy.sh
```

### Database Backup
```bash
# Backup PostgreSQL
docker compose exec postgres pg_dump -U postgres crm_project > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260831.sql | docker compose exec -T postgres psql -U postgres crm_project
```

### Check SSL Certificate
```bash
# Check expiry
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run
```

### Monitor Disk Space
```bash
# Check disk usage
df -h

# Docker disk usage
docker system df

# Clean up unused Docker images
docker system prune -a --volumes
```

---

## Troubleshooting

### Container won't start
```bash
docker compose logs <service-name>
```

### Database connection error
```bash
# Check if postgres is healthy
docker compose exec postgres pg_isready -U postgres

# Restart postgres
docker compose restart postgres
```

### S3 upload failing
```bash
# Check S3 credentials
docker compose exec backend python -c "from app.core.s3 import check_s3_health; print(check_s3_health())"
```

### SSL certificate renewal failed
```bash
# Check certbot logs
sudo cat /var/log/letsencrypt/letsencrypt.log

# Manual renewal
sudo certbot renew --force-renewal
docker compose restart nginx
```

### Out of memory
```bash
# Check memory usage
free -m

# Check if swap is active
swapon -s

# Restart to free memory
docker compose restart
```

---

## Cost Estimate (Monthly)

| Resource          | Type          | Estimated Cost |
|-------------------|---------------|----------------|
| EC2               | t3.small      | ~$15/month     |
| Elastic IP        | (in use)      | Free           |
| S3 Storage        | First 5 GB    | ~$0.12/month   |
| S3 Requests       | ~10k req/mo   | ~$0.05/month   |
| Data Transfer     | First 100 GB  | ~$9/month      |
| **Total**         |               | **~$25/month** |

> Prices based on ap-south-1 (Mumbai) region. Your actual costs may vary.
