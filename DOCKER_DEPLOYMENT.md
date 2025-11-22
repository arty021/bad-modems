# Docker Deployment Guide

## Prerequisites
- Docker installed on your machine
- Docker Compose installed (optional, but recommended)

## Quick Start with Docker Compose (Recommended)

### 1. Build and start the container
```bash
docker-compose up -d --build
```

### 2. Check if the container is running
```bash
docker-compose ps
```

### 3. View logs
```bash
docker-compose logs -f
```

### 4. Stop the container
```bash
docker-compose down
```

### 5. Access the application
Open your browser and navigate to: `http://localhost:5000`

## Manual Docker Commands (Alternative)

### 1. Build the Docker image
```bash
docker build -t modem-analysis-web .
```

### 2. Run the container
```bash
docker run -d \
  --name modem_analysis_web \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  modem-analysis-web
```

### 3. Check container status
```bash
docker ps
```

### 4. View container logs
```bash
docker logs -f modem_analysis_web
```

### 5. Stop and remove the container
```bash
docker stop modem_analysis_web
docker rm modem_analysis_web
```

## Data Persistence

The application uses two volumes to persist data:
- `./data` - Stores analysis results (JSON files)
- `./uploads` - Stores uploaded CSV files

These directories are mounted from your host machine, so data will persist even if you restart or rebuild the container.

## Troubleshooting

### Container won't start
```bash
# Check logs for errors
docker-compose logs

# Or for manual Docker
docker logs modem_analysis_web
```

### Port already in use
If port 5000 is already in use, you can change it in `docker-compose.yml`:
```yaml
ports:
  - "8080:5000"  # Change 8080 to any available port
```

### Rebuild after code changes
```bash
docker-compose up -d --build
```

## Production Deployment

For production deployment:
1. Consider using a reverse proxy (nginx) in front of the application
2. Enable HTTPS/SSL
3. Set up proper logging and monitoring
4. Configure resource limits in docker-compose.yml
5. Use environment variables for sensitive configuration

## Health Check

The container includes a health check that runs every 30 seconds. You can check the health status:
```bash
docker inspect modem_analysis_web | grep -A 10 Health
```
