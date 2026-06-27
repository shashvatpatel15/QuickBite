#!/usr/bin/env bash
set -o errexit

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Applying migrations..."
python manage.py migrate

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Build completed successfully!"