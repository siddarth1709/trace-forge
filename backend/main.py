from pathlib import Path
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="TRACEFORGE API",
    description="Graph-powered security investigation and response simulator",
    version="0.1.0",
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "project": "TraceForge",
        "status": "running",
        "message": "Security investigation backend is ready",
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "traceforge-backend",
    }

if __name__ == "__main__":
    import uvicorn

    # Ensure backend directory is on sys.path for uvicorn reloader
    backend_dir = Path(__file__).resolve().parent
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)