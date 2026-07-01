# ==========================
# Base Image
# ==========================
FROM python:3.11.3-slim

# ==========================
# Python Settings
# ==========================
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# ==========================
# Working Directory
# ==========================
WORKDIR /app

# ==========================
# System Dependencies
# ==========================
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# ==========================
# Upgrade pip
# ==========================
RUN pip install --upgrade pip

# ==========================
# Install Dependencies
# ==========================
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# ==========================
# Copy Project
# ==========================
COPY . .

# ==========================
# Collect Static Files
# ==========================
RUN python manage.py collectstatic --noinput || true

# ==========================
# Expose Port
# ==========================
EXPOSE 8000

# ==========================
# Start Server
# ==========================
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]