# Hermes-Net / Sentinel-Net

## What it is
Autonomous hurricane evacuation simulation for Tampa Bay.
30 residents, AI agents, real Tampa geography.

## Status
- Gates 1-4 complete and working
- Gate 5 (ADK agents) next
- Frontend not started

## Run the backend
cd backend
uvicorn main:app --reload

## Endpoints
GET  /state   - current simulation state
POST /tick    - advance one tick
POST /reset   - restart simulation
WS   /ws      - live stream every second

## Stack
- Python 3.12 / Mesa 3.5.1 / FastAPI
- Google ADK + Gemini (Gate 5)
- React + Mapbox (frontend)
```

This means Claude Code can read the README and immediately understand the project without you explaining everything again.

---

## One Thing This Chat Is Good For

Keep this conversation open in a browser tab. If you ever need to explain a concept, understand an architecture decision, or figure out why something is designed a certain way — come back here.
```
Claude Code  →  writing and running code
This chat    →  understanding and decisions