import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.api.file_routes import router as file_router
from backend.api.chat_routes import router as chat_router
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="AI Search Chat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOWED_ORIGINS").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(file_router)
app.include_router(chat_router)

os.makedirs("backend/uploads", exist_ok=True)
app.mount("/api/pdf/files", StaticFiles(directory="backend/uploads"), name="pdf_files")

@app.get("/")
async def root():
    return {"message": "AI Search Chat API is running"}

@app.get("/api/health")
async def health_check():
    return {"status": "success"}

import asyncio
from backend.services.file_service import file_service

async def periodic_cleanup():
    while True:
        await asyncio.sleep(3600) # 1 hour
        file_service.reset_vector_store()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(periodic_cleanup())
