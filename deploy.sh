#!/bin/bash

set -e

echo "🚀 Starting deployment process..."

# Navigate to the sintesi directory (not app subdirectory)
cd ~/sites/sintesi

# Load environment variables safely
if [ -f .env ]; then
    set -a  # automatically export all variables
    source .env
    set +a  # stop automatically exporting
fi

echo "📥 Pulling latest Docker image..."
docker pull ghcr.io/dnlml/sintesi:latest

echo "🛑 Stopping existing container..."
docker-compose down || true

echo "🧹 Cleaning up old images..."
docker image prune -f

echo "📦 Starting new container..."
docker-compose up -d

echo "⏳ Waiting for container to be ready..."
sleep 10

echo "🔍 Checking container health..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Deployment successful!"
    docker-compose logs --tail=20
else
    echo "❌ Deployment failed!"
    docker-compose logs --tail=50
    exit 1
fi

echo "🎉 Deployment completed successfully!"