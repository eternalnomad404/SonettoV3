# Sonetto

AI-powered session management desktop application.

## Quick Start

### 1. Install Dependencies
```bash
npm install
cd apps/desktop/electron && npm install && cd ../../..
cd services/api && pip install -r requirements.txt && cd ../..
```

### 2. Run the Application

**Option A: Desktop App (Recommended)**
```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start backend
cd services/api
.\venv\Scripts\Activate
python main.py

# Terminal 3: Launch Electron
npm run electron:dev
```

**Option B: Docker**
```bash
cd infra/docker
docker compose up -d
```

## Architecture

- **Frontend**: React + TypeScript + Vite (port 5173)
- **Backend**: FastAPI + Python (port 8000)  
- **Desktop**: Electron wrapper
- **Databases**: PostgreSQL (sessions) + MongoDB Atlas (AI data)

## Documentation

- [Backend API](services/api/README.md)
- [Electron Desktop](apps/desktop/electron/README.md)
- [Docker Deployment](infra/docker/README.md)

## Ports

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
