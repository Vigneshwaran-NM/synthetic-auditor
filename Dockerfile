# CUDA runtime
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# System deps
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3-pip \
    wkhtmltopdf \
    xvfb \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set python
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

WORKDIR /app

# Install deps
COPY requirements.txt .
RUN pip3 install --upgrade pip && pip3 install -r requirements.txt

# Copy app
COPY . .

# Runtime dirs
RUN mkdir -p reports uploads static

EXPOSE 8000

# Healthcheck
HEALTHCHECK CMD curl -f http://localhost:8000/api/v1/health || exit 1

# IMPORTANT: Ollama is expected on HOST
ENV OLLAMA_BASE_URL=http://host.docker.internal:11434

CMD ["python3", "-m", "app.main"]
