# pgAdmin Connection Settings for Sonetto V3

## Docker PostgreSQL (PRODUCTION DATA - USE THIS)

**These settings connect to the Docker PostgreSQL container that the backend uses.**

```
Server Name:     Sonetto Docker PostgreSQL
Host:            localhost
Port:            5433
Maintenance DB:  postgres
Username:        postgres
Password:        Killer921136
Database:        SonettoV3
```

### Connection Steps:
1. Open pgAdmin
2. Right-click "Servers" → "Register" → "Server"
3. **General tab:** Name = "Sonetto Docker PostgreSQL"
4. **Connection tab:** 
   - Host = `localhost`
   - Port = `5433`
   - Maintenance database = `postgres`
   - Username = `postgres`
   - Password = `Killer921136`
5. Click "Save"
6. Expand the server → Databases → SonettoV3

### Verification Query:
Run this in pgAdmin query tool to confirm you're connected to the correct database:

```sql
SELECT 
    current_database() as db_name,
    COUNT(*) as session_count,
    MAX(created_at) as latest_session
FROM sessions;
```

**Expected Result:**
- `db_name`: SonettoV3
- `session_count`: Should match what you see in the UI
- `latest_session`: Should match the most recent upload

---

## Local PostgreSQL (OLD DATA - DO NOT USE)

Your local Windows PostgreSQL service runs on port `5432`.
This has **old seeded data** and is NOT connected to the backend.

**Do NOT connect pgAdmin to port 5432 for Sonetto work.**

---

## Why Port Separation?

**Before:** Both databases on port 5432 → pgAdmin connected to wrong one
**After:** 
- Local PostgreSQL: `localhost:5432`
- Docker PostgreSQL: `localhost:5433`
- No ambiguity - impossible to connect to wrong database

Backend continues using internal Docker network (`postgres:5432`), unaffected by host port changes.
