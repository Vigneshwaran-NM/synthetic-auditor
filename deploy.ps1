# ==========================================
# Synthetic Auditor - Windows Deployment Script
# ==========================================

Write-Host "🚀 Deploying Synthetic Auditor..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# -------------------------------
# Check Docker
# -------------------------------
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "👉 https://www.docker.com/products/docker-desktop/"
    exit 1
}

# -------------------------------
# Detect Docker Compose
# -------------------------------
$composeCmd = $null

try {
    docker compose version | Out-Null
    $composeCmd = "docker compose"
} catch {
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        $composeCmd = "docker-compose"
    } else {
        Write-Host "❌ Docker Compose not found." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Using compose command: $composeCmd" -ForegroundColor Green

# -------------------------------
# GPU Detection (Safe for Windows)
# -------------------------------
$gpuAvailable = $false
try {
    docker info | Select-String -Pattern "nvidia" | Out-Null
    $gpuAvailable = $true
} catch {}

if ($gpuAvailable) {
    Write-Host "✅ NVIDIA runtime detected (GPU enabled)" -ForegroundColor Green
} else {
    Write-Host "⚠️ NVIDIA runtime not detected. Running in CPU mode." -ForegroundColor Yellow
}

# -------------------------------
# Create runtime directories
# -------------------------------
Write-Host "📁 Creating runtime directories..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path reports, uploads, ssl | Out-Null

# -------------------------------
# Build Docker images
# -------------------------------
Write-Host "🔨 Building Docker images..." -ForegroundColor Cyan
Invoke-Expression "$composeCmd build"

# -------------------------------
# Start services
# -------------------------------
Write-Host "🚀 Starting services..." -ForegroundColor Cyan
Invoke-Expression "$composeCmd up -d"

# -------------------------------
# Wait for services
# -------------------------------
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 12

# -------------------------------
# Backend health check
# -------------------------------
Write-Host "🏥 Checking backend health..." -ForegroundColor Cyan
try {
    $backend = Invoke-WebRequest "http://localhost:8000/api/v1/health" -UseBasicParsing
    Write-Host "✅ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend health check failed" -ForegroundColor Red
    Invoke-Expression "$composeCmd logs backend"
    exit 1
}

# -------------------------------
# Frontend health check
# -------------------------------
Write-Host "🏥 Checking frontend..." -ForegroundColor Cyan
try {
    $frontend = Invoke-WebRequest "http://localhost" -UseBasicParsing
    Write-Host "✅ Frontend is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend health check failed" -ForegroundColor Red
    Invoke-Expression "$composeCmd logs frontend"
    exit 1
}

# -------------------------------
# Success message
# -------------------------------
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "🎉 DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost"
Write-Host "   Backend API: http://localhost:8000"
Write-Host "   API Docs: http://localhost:8000/docs"
Write-Host ""
Write-Host "📊 Running Containers:" -ForegroundColor Cyan
Invoke-Expression "$composeCmd ps"
Write-Host ""
Write-Host "🛠️ Management Commands:" -ForegroundColor Cyan
Write-Host "   Stop:     $composeCmd down"
Write-Host "   Restart: $composeCmd restart"
Write-Host "   Logs:    $composeCmd logs -f"
Write-Host ""
Write-Host "🔒 For production, configure SSL certificates in ./ssl" -ForegroundColor Yellow
