#!/bin/bash
set -e

echo "🔄 Updating Synthetic Auditor"
echo "=========================================="

# Detect Compose
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "❌ Docker Compose not found."
  exit 1
fi

echo "📥 Pulling latest code..."
git pull

echo "🔨 Rebuilding images..."
$COMPOSE_CMD build

echo "🔄 Restarting services..."
$COMPOSE_CMD up -d

echo "✅ Update complete"
$COMPOSE_CMD ps
