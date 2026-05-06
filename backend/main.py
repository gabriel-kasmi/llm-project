from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from agents import sql_agent, rag_agent, semantic_layer_agent, files, fine_tuning_agent
import os

app = FastAPI(title="Unified LLM Backend")

# Restrict CORS to frontend origin
frontend_origin = os.environ.get("FRONTEND_URL")
# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sql_agent.router, prefix="/api/sql", tags=["SQL"])
app.include_router(rag_agent.router, prefix="/api/rag", tags=["RAG"])
app.include_router(semantic_layer_agent.router, prefix="/api/semantic_layer", tags=["Semantic Layer"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(fine_tuning_agent.router, prefix="/api/fine_tuning", tags=["Fine Tuning"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Unified LLM Backend is running."}
