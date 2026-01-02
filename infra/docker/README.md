# Sonetto Docker

Docker deployment for Sonetto backend and PostgreSQL.

## Quick Start

```bash
cd infra/docker
docker compose up -d
```

## Configuration

Create `.env` file with:
```env
POSTGRES_PASSWORD=your_password
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/?appName=task-manager
```

## Services

- **postgres**: PostgreSQL 16 (port 5432)
- **backend**: FastAPI (port 8000)
- **MongoDB**: Uses Atlas cloud (no container)

## Commands

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# View logs
docker compose logs -f backend

# Stop services
docker compose down

# Clean restart
docker compose down -v
docker compose up -d --build
```

## Access

- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

## Files

- `Dockerfile` - Backend API image
- `docker-compose.yml` - Stack orchestration
- `.dockerignore` - Build optimization
- `.env` - Environment variables (gitignored)
