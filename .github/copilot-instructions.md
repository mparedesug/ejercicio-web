# Copilot / AI Agent Instructions for this repository 🔧

Quick, practical guidance to get productive with this codebase.

## Big picture (what this repo is)
- A minimal FastAPI application that serves a small in-memory API and a static front-end.
- Key files:
  - `src/app.py` — single FastAPI app, mounts static files and exposes the API.
  - `src/static/index.html`, `src/static/app.js`, `src/static/styles.css` — small client that lists activities and posts signups.
  - `src/README.md`, `README.md` — local developer notes (see run instructions below).
- Data model: activities are stored in-memory in the `activities` dict (keyed by activity name). Each entry has: `description`, `schedule`, `max_participants`, `participants` (list of emails).

## How to run / debug (concrete commands) ✅
- Create and activate a venv and install deps: 

  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt

- Recommended: run with Uvicorn from repo root:

  .venv/bin/uvicorn src.app:app --reload

- Note: `src/README.md` suggests `python app.py`, but `src/app.py` does not include a `if __name__ == '__main__'` runner—use the `uvicorn` command above.
- Use the built-in FastAPI docs while running:
  - Swagger: http://localhost:8000/docs
  - Redoc: http://localhost:8000/redoc
- The app serves the frontend at root via a redirect to `/static/index.html`.

## Important conventions & patterns (project-specific) ⚠️
- Identifiers used in the API:
  - Activity identity = activity name (string). Example: `"Chess Club"`.
  - Student identity = email address (string).
- API shapes are simple and predictable:
  - GET `/activities` returns the whole `activities` dict (keyed by name).
  - POST `/activities/{activity_name}/signup?email=...` appends the email to `participants` and returns `{ "message": ... }`.
- Frontend expectations (see `src/static/app.js`):
  - The JSON shape includes `max_participants` and `participants` list so client calculates `spotsLeft = max_participants - participants.length`.
  - The client encodes activity names with `encodeURIComponent(...)` (important because names include spaces).

## Known gaps & behavior to be aware of (good first-change ideas) 💡
- No persistence: all data is in-memory; server restart clears state.
- No server-side validation for signup:
  - Duplicate signups are allowed (email can be appended multiple times).
  - `max_participants` is not enforced on the backend; the client only *displays* availability.
  - There is no concurrency protection (global mutable `activities` may race under concurrent requests).

Concrete small improvements that are easy to implement and test:
- Enforce max participants in `src/app.py`:
  - Check `len(activity["participants"]) >= activity["max_participants"]` and raise `HTTPException(status_code=400, detail="Activity is full")`.
- Prevent duplicate signups:
  - If `email in activity["participants"]` -> raise `HTTPException(400, detail="Already signed up")`.
- Add tests under `tests/` using pytest. `pytest.ini` already sets `pythonpath = .`.
- Add an optional persistence layer (SQLite or JSON file) behind a small abstraction to avoid changing API shapes.

## How to add & test changes (workflow tips) 🧪
- Modify `src/app.py` and run the server with Uvicorn as above. Use the UI at `/docs` to quickly test endpoints.
- Frontend can be used to do manual end-to-end testing (fills signup requests via `/activities/<name>/signup?email=...`).
- Add pytest tests for:
  - GET `/activities` JSON shape and keys
  - POST signup success, duplicate signup failure, signup when full
- Keep modifications confined and well-documented: this project is intentionally tiny—prefer minimal, focused PRs.

## Files to inspect for more context 📁
- `src/app.py` — primary place for request handlers and data model.
- `src/static/app.js` — frontend that consumes the API (good to mirror validation rules you add server-side).
- `src/README.md` and root `README.md` — run instructions and quick context (note the `python app.py` mismatch highlighted above).

---

If anything above is unclear or you'd like me to add example tests, a specific endpoint change, or a small PR implementing one of the improvements (eg. enforce max capacity + tests), tell me which task to prioritize and I will implement it. ✅
