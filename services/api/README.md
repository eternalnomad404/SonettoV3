# Sonetto API

Production-ready FastAPI backend for Sonetto AI-powered session management.

## Architecture

### PostgreSQL (System of Record)
- **sessions table**: Core session metadata
- **Handles**: File references, status tracking, system data

### MongoDB (Future AI Features)
- **Initialized but unused in V1**
- **Future use**: Transcripts, AI outputs, RAG data, embeddings

---

## Structure

```
services/api/
├── main.py                  # FastAPI app entry point
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables
│
├── core/
│   └── config.py            # Pydantic settings (DATABASE_URL, MONGO_URL)
│
├── db/
│   ├── postgres/
│   │   ├── database.py      # SQLAlchemy engine + session factory
│   │   ├── models.py        # Session model (maps to sessions table)
│   │   └── deps.py          # get_db() dependency injection
│   │
│   └── mongo/
│       └── database.py      # MongoDB client (initialized, no collections)
│
└── api/
    └── routes/
        └── sessions.py      # CRUD endpoints for sessions
```

---

## Setup

### 1. Install Dependencies
```bash
cd services/api
pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env` and update credentials:
```bash
cp .env.example .env
```

### 3. Run the Server
```bash
python main.py
```

Or with uvicorn:
```bash
uvicorn main:app --reload --port 8000
```

---

## API Endpoints

### Sessions
- `POST /sessions` - Create session
- `GET /sessions` - List sessions (paginated)
- `GET /sessions/{id}` - Get session by ID
- `PATCH /sessions/{id}` - Update session
- `DELETE /sessions/{id}` - Delete session

### Health
- `GET /` - Basic health check
- `GET /health` - Detailed health check

---

## Database Connection

### PostgreSQL
- Uses SQLAlchemy with connection pooling
- Automatically manages sessions via dependency injection
- No auto-migrations (schema is fixed)

### MongoDB
- PyMongo client initialized on startup
- **Not actively used in V1**
- Ready for future transcript/AI features

---

## Design Principles

✅ **Separation of Concerns**: PostgreSQL for structured data, MongoDB for unstructured AI outputs  
✅ **Dependency Injection**: Database sessions properly managed via FastAPI dependencies  
✅ **Production-Ready**: Connection pooling, health checks, proper error handling  
✅ **Extensible**: Clean structure ready for AI features, authentication, file processing  
✅ **No Over-Engineering**: Minimal V1 implementation, no premature abstractions

---

## Next Steps

- [ ] Add authentication/authorization
- [ ] Implement file upload handling
- [ ] Add transcript storage (MongoDB)
- [ ] Integrate AI processing pipeline
- [ ] Add background job processing (Celery/RQ)
