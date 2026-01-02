# Sonetto Backend API

FastAPI backend with PostgreSQL and MongoDB.

## Setup

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\Activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Configure

Create `.env` file:
```env
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/SonettoV3
MONGO_URL=mongodb+srv://USER:PASS@cluster.mongodb.net/?appName=task-manager
APP_NAME=Sonetto API
VERSION=1.0.0
```

## Run

```bash
python main.py
```

Access:
- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`

## API Endpoints

### Sessions
- `POST /sessions/` - Create
- `GET /sessions/` - List all
- `GET /sessions/{id}` - Get by ID
- `PATCH /sessions/{id}` - Update
- `DELETE /sessions/{id}` - Delete

## Database

### PostgreSQL (Sessions)
System of record for structured data.

### MongoDB Atlas (AI Data)
Connected but no collections yet - ready for future AI features.
