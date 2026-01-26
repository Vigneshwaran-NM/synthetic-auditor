#!/bin/bash
set -e

echo "🚀 Deploying Synthetic Auditor"
echo "=========================================="

# Detect Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker not found. Install Docker first."
  exit 1
fi

# Detect Compose
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "❌ Docker Compose not found."
  exit 1
fi

echo "✅ Using compose command: $COMPOSE_CMD"

# GPU check (portable)
if docker info | grep -i nvidia >/dev/null 2>&1; then
  echo "✅ NVIDIA runtime detected (GPU acceleration enabled)"
else
  echo "⚠️  NVIDIA runtime not detected. Running in CPU mode."
fi

# Create runtime directories
echo "📁 Creating runtime directories..."
mkdir -p reports uploads ssl

# Build images
echo "🔨 Building images..."
$COMPOSE_CMD build

# Start services
echo "🚀 Starting services..."
$COMPOSE_CMD up -d

# Wait
echo "⏳ Waiting for services..."
sleep 12

# Health check backend
echo "🏥 Checking backend..."
if curl -sf http://localhost:8000/api/v1/health >/dev/null; then
  echo "✅ Backend is running"
else
  echo "❌ Backend health check failed"
  $COMPOSE_CMD logs backend
  exit 1
fi

# Health check frontend (PORT 80)
echo "🏥 Checking frontend..."
if curl -sf http://localhost >/dev/null; then
  echo "✅ Frontend is running"
else
  echo "❌ Frontend health check failed"
  $COMPOSE_CMD logs frontend
  exit 1
fi

echo ""
echo "=========================================="
echo "🎉 DEPLOYMENT SUCCESSFUL"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
$COMPOSE_CMD ps
