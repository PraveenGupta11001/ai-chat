import asyncio
import os
import sys
import json
import requests

# Add project root to path
sys.path.append(os.getcwd())

from backend.services.agent_service import agent_service
from backend.services.file_service import file_service

async def test_final_flow():
    # 1. Reset the database
    print("Resetting database...")
    file_service.reset_vector_store()
    
    # 2. Ingest a Text file
    txt_name = "assignment.txt"
    txt_content = b"This is a test document for CalQuity assignment. It mentions that the stack is Next.js and FastAPI."
    print(f"Ingesting {txt_name}...")
    await file_service.ingest_file(txt_content, txt_name)
    await asyncio.sleep(1)

    # 3. Ingest a JSON
    json_name = "package-lock.json"
    json_content = b'{"dependencies": {"next": "14.1.0"}}'
    print(f"Ingesting {json_name}...")
    await file_service.ingest_file(json_content, json_name)
    await asyncio.sleep(1)

    # 4. Ask to list documents
    thread_id = "final_test_thread_v2"
    query1 = "What documents have I uploaded?"
    print(f"\nAsking: {query1}")
    
    async for chunk_json in agent_service.stream_response(query1, thread_id=thread_id):
        chunk = json.loads(chunk_json)
        if chunk["type"] == "text":
            print(chunk["content"], end="", flush=True)
        elif chunk["type"] == "tool_call":
            print(f"\n[Tool Call: {chunk['content']}]")

    # 5. Ask about the PDF
    query2 = "What does the CalQuity assignment mention about the stack?"
    print(f"\n\nAsking: {query2}")
    
    async for chunk_json in agent_service.stream_response(query2, thread_id=thread_id):
        chunk = json.loads(chunk_json)
        if chunk["type"] == "text":
            print(chunk["content"], end="", flush=True)
        elif chunk["type"] == "tool_call":
            print(f"\n[Tool Call: {chunk['content']}]")
        elif chunk["type"] == "citation":
            print(f"\n[Citation: {chunk['text']}]")

    # 6. Ask a follow-up about the JSON (history test)
    query3 = "And what version of Next.js is in the lockfile?"
    print(f"\n\nAsking: {query3}")
    
    async for chunk_json in agent_service.stream_response(query3, thread_id=thread_id):
        chunk = json.loads(chunk_json)
        if chunk["type"] == "text":
            print(chunk["content"], end="", flush=True)
        elif chunk["type"] == "tool_call":
            print(f"\n[Tool Call: {chunk['content']}]")
        elif chunk["type"] == "citation":
            print(f"\n[Citation: {chunk['text']}]")
    print("\n")

if __name__ == "__main__":
    # Ensure server is running for the reset call, or just call file_service directly
    # Since we are in the same process, we can just call file_service.reset_vector_store()
    file_service.reset_vector_store()
    asyncio.run(test_final_flow())
