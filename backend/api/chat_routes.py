from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uuid
import asyncio
from backend.services.agent_service import agent_service
import json
import logging

# Setup logger
logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api/chat", tags=["chat"])

# In-memory job store: job_id -> asyncio.Queue
jobs = {}

class ChatRequest(BaseModel):
    query: str

async def process_chat(job_id: str, query: str, thread_id: str = "default"):
    job = jobs.get(job_id)
    if not job:
        return
    queue = job["queue"]
    
    try:
        # Use agent_service instead of chat_service
        async for chunk in agent_service.stream_response(query, thread_id=thread_id):
            await queue.put(chunk)
    except Exception as e:
        logger.error(f"ERROR in process_chat: {e}")
        await queue.put(json.dumps({"type": "error", "content": str(e)}))
    finally:
        await queue.put("[DONE]")

@router.post("")
@router.post("/")
async def start_chat(request: ChatRequest):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "queue": asyncio.Queue(),
        "query": request.query
    }
    return {"job_id": job_id}

@router.get("/stream/{job_id}")
async def stream_chat(job_id: str, thread_id: str = "default"):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    queue = job["queue"]
    query = job["query"]

    # Start processing now that we have the thread_id
    asyncio.create_task(process_chat(job_id, query, thread_id))

    async def event_generator():
        # Send an initial message to confirm connection
        yield f"data: {json.dumps({'type': 'status', 'content': 'connected'})}\n\n"
        
        try:
            while True:
                data = await queue.get()
                if data == "[DONE]":
                    yield "data: [DONE]\n\n"
                    break
                # Ensure no internal newlines break the SSE format
                # For JSON this is usually fine, but let's be safe
                yield f"data: {data}\n\n"
        except Exception as e:
            print(f"SSE stream error: {e}")
        finally:
            if job_id in jobs:
                del jobs[job_id]

    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no" # For Nginx
        }
    )
