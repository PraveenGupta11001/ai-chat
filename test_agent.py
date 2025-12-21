import asyncio
import os
import sys
import json

# Add project root to path
sys.path.append(os.getcwd())

from backend.services.agent_service import agent_service
from backend.services.file_service import file_service

async def test_agent_flow():
    # 1. Ingest a document
    test_file = "france.txt"
    content = b"The capital of France is Paris. It is known for the Eiffel Tower."
    print(f"Ingesting {test_file}...")
    await file_service.ingest_file(content, test_file)

    # 2. Ask a question
    thread_id = "test_thread_123"
    query = "What is the capital of France?"
    print(f"\nAsking: {query}")
    
    async for chunk_json in agent_service.stream_response(query, thread_id=thread_id):
        chunk = json.loads(chunk_json)
        if chunk["type"] == "text":
            print(chunk["content"], end="", flush=True)
        elif chunk["type"] == "tool_call":
            print(f"\n[Tool Call: {chunk['content']}]")
        elif chunk["type"] == "citation":
            print(f"\n[Citation: {chunk['text']}]")

    # 3. Ask a follow-up question (test history)
    query2 = "What is it known for?"
    print(f"\n\nAsking: {query2}")
    
    async for chunk_json in agent_service.stream_response(query2, thread_id=thread_id):
        chunk = json.loads(chunk_json)
        if chunk["type"] == "text":
            print(chunk["content"], end="", flush=True)
        elif chunk["type"] == "tool_call":
            print(f"\n[Tool Call: {chunk['content']}]")
        elif chunk["type"] == "citation":
            print(f"\n[Citation: {chunk['text']}]")
    print("\n")

if __name__ == "__main__":
    asyncio.run(test_agent_flow())
