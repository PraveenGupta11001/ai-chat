from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.services.file_service import file_service
import os

router = APIRouter(prefix="/api/pdf", tags=["files"]) # Keep prefix for now to avoid breaking frontend

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        file_path = await file_service.ingest_file(content, file.filename)
        if not file_path:
            raise HTTPException(status_code=500, detail="Failed to process file")
            
        return {
            "filename": file.filename,
            "status": "success",
            "url": f"/api/pdf/files/{file.filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset")
async def reset_database():
    success = file_service.reset_vector_store()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to reset database")
    return {"message": "Database reset successfully"}
