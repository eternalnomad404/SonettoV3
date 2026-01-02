# Sonetto V3

Production-grade AI-powered session management platform.

## 🏗️ Architecture

```
SonettoV3/
├── apps/
│   └── desktop/
│       ├── ui/              # React + TypeScript frontend
│       └── electron/        # Electron desktop wrapper
│
├── services/
│   └── api/                 # FastAPI backend
│       ├── core/           # Configuration
│       ├── db/             # Database layers
│       │   ├── postgres/   # PostgreSQL (system of record)
│       │   └── mongo/      # MongoDB (AI/unstructured data)
│       └── api/            # REST API routes
│
├── packages/               # Shared code (future)
├── infra/                  # Infrastructure configs
└── docker-compose.yml      # Full stack orchestration
```

## 🗄️ Databases

### PostgreSQL (System of Record)
- **Purpose**: Structured data, sessions, file metadata
- **Location**: Local or Docker container
- **Schema**: Fixed, no auto-migrations

### MongoDB Atlas (AI & Unstructured Data)
- **Purpose**: Transcripts, AI outputs, embeddings, RAG data
- **Location**: Cloud-hosted (Atlas)
- **Collections**: Created dynamically as needed

---

## 🚀 Quick Start

### 1. Frontend (Web Development)
```bash
npm install
npm run dev
```
Runs at `http://localhost:5173`

### 2. Backend (API Server)
```bash
cd services/api
python -m venv venv
.\venv\Scripts\Activate  # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
python main.py
```
Runs at `http://localhost:8000`

### 3. Electron (Desktop App)
```bash
# Terminal 1: Start frontend dev server
npm run dev

# Terminal 2: Start Electron
npm run electron:dev
```

### 4. Docker (Full Stack)
```bash
# Copy and configure environment
cp .env.docker.example .env.docker

# Edit .env.docker with your credentials

# Build and run
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs

# Stop
npm run docker:down
```

---

## 📋 Environment Variables

### Backend (services/api/.env)
```env
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/SonettoV3
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/?appName=task-manager
APP_NAME=Sonetto API
VERSION=1.0.0
```

### Docker (.env.docker)
```env
POSTGRES_PASSWORD=your_password
MONGO_URL=mongodb+srv://...
```

---

## 🛠️ Development Workflow

### Run Everything Locally
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd services/api
.\venv\Scripts\Activate
python main.py

# Terminal 3 (optional): Electron
npm run electron:dev
```

### Build for Production
```bash
# Build frontend
npm run build

# Build Electron
npm run build:electron

# Build Docker images
npm run docker:build
```

---

## 🐳 Docker Commands

```bash
# Build
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Remove volumes (clean slate)
docker-compose down -v
```

---

## 📦 Project Structure

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS v4
- **Routing**: React Router DOM
- **State**: TanStack Query

### Backend
- **Framework**: FastAPI
- **ORM**: SQLAlchemy
- **Validation**: Pydantic
- **Server**: Uvicorn

### Desktop
- **Runtime**: Electron 33
- **Mode**: Loads React app in window
- **Dev**: Points to localhost:5173
- **Prod**: Loads built HTML

---

## 🔌 API Endpoints

### Health
- `GET /` - Basic health check
- `GET /health` - Detailed health status

### Sessions
- `POST /sessions` - Create session
- `GET /sessions` - List all sessions
- `GET /sessions/{id}` - Get session by ID
- `PATCH /sessions/{id}` - Update session
- `DELETE /sessions/{id}` - Delete session

API Docs: `http://localhost:8000/docs`

---

## 🧪 Database Setup

### PostgreSQL
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    session_type TEXT,
    duration_seconds INTEGER,
    original_file_path TEXT,
    audio_file_path TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### MongoDB
No schema required - document-based, created on demand.

---

## 🎯 Deployment

### Option 1: Docker Compose (Recommended)
```bash
docker-compose up -d
```
Includes PostgreSQL + Backend

### Option 2: Separate Services
- Frontend: Deploy to CDN/Nginx
- Backend: Deploy as container
- PostgreSQL: Managed service
- MongoDB: Atlas (already cloud)

---

## 📝 Notes

- **Frontend runs on port 5173** (dev) or as Electron app
- **Backend runs on port 8000**
- **PostgreSQL runs on port 5432**
- **MongoDB is cloud-hosted** (no local port)
- **.env files are gitignored** - never commit credentials

---

## 🔒 Security

- All credentials in environment variables
- No hardcoded secrets
- Proper .gitignore and .dockerignore
- CORS configured for localhost only (update for production)

---

## 🚧 Known Limitations

1. MongoDB collections not yet created (groundwork only)
2. No authentication/authorization yet
3. CORS hardcoded for localhost (update for production)
4. Electron packaging not fully configured

---

## 📞 Support

For issues or questions, check:
- Backend API docs: `http://localhost:8000/docs`
- Frontend console: Browser DevTools
- Backend logs: Terminal or `docker-compose logs`
