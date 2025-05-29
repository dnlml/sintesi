# Deployment Guide

This document explains how to deploy the Sintesi application to a VPS using Docker and nginx-proxy.

## Prerequisites

### VPS Setup

1. Docker and Docker Compose installed
2. jwilder/nginx-proxy running with letsencrypt companion
3. SSH access configured

### GitHub Secrets Required

Set these secrets in your GitHub repository settings:

```
VPS_SSH_KEY                 # Private SSH key for VPS access
OPENAI_API_KEY             # OpenAI API key
ELEVENLABS_API_KEY         # ElevenLabs API key
AWS_ACCESS_KEY_ID          # AWS S3 access key
AWS_SECRET_ACCESS_KEY      # AWS S3 secret key
AWS_REGION                 # AWS region (e.g., eu-west-3)
AWS_S3_BUCKET             # S3 bucket name
DATABASE_URL               # PostgreSQL connection string
STRIPE_SECRET_KEY          # Stripe secret key
STRIPE_WEBHOOK_SECRET      # Stripe webhook secret
RESEND_API_KEY            # Resend email API key
EMAIL_FROM                # From email address
EMAIL_REPLY_TO            # Reply-to email address
TEST_MODE_TOKEN           # Test mode authentication token
GOD_MODE_TOKEN            # God mode authentication token
VIRTUAL_HOST              # Your domain name (e.g., sintesi.yourdomain.com)
LETSENCRYPT_HOST          # Same as VIRTUAL_HOST
LETSENCRYPT_EMAIL         # Let's Encrypt email
```

## nginx-proxy Setup

Your VPS already has the nginx-proxy setup with:

- `nginx-proxy` (main reverse proxy)
- `nginx-proxy-gen` (configuration generator)
- `nginx-proxy-le` (Let's Encrypt companion)

## VPS Directory Structure

The deployment uses this directory structure on your VPS:

```
~/sites/sintesi/
├── docker-compose.yml
├── deploy.sh
├── .env
├── app/               # Contains built application files
└── public/            # Static files (audio summaries)
```

## Manual Deployment

To deploy manually:

1. SSH into your VPS
2. Navigate to the sintesi directory: `cd ~/sites/sintesi`
3. Pull the latest image: `docker pull ghcr.io/dnlml/sintesi:latest`
4. Update the container: `docker-compose up -d`

## Troubleshooting

### Container Won't Start

```bash
# Check logs
cd ~/sites/sintesi
docker-compose logs -f

# Check if the nginx-proxy network exists
docker network ls | grep nginx-proxy
```

### SSL Certificate Issues

```bash
# Check nginx-proxy logs
docker logs nginx-proxy
docker logs nginx-proxy-le

# Verify domain DNS points to your VPS
dig your-domain.com
```

### Environment Variables

```bash
# Verify .env file exists and has correct values
cd ~/sites/sintesi
cat .env

# Check if container can read environment variables
docker-compose exec sintesi env
```

### Permission Issues

```bash
# Check permissions on public directory
ls -la ~/sites/sintesi/public/

# If needed, fix permissions
sudo chown -R dnlml:docker ~/sites/sintesi/public/
```

## Health Checks

The application should be accessible at your configured domain. Check:

1. HTTP redirect to HTTPS works
2. Application loads correctly
3. API endpoints respond properly
4. File uploads work (public directory is writable)

## Logs

View application logs:

```bash
cd ~/sites/sintesi
docker-compose logs -f sintesi
```

View nginx-proxy logs:

```bash
docker logs nginx-proxy
docker logs nginx-proxy-le
```
