import asyncio
import os
import sys
import json

# Add project root to path
sys.path.append(os.getcwd())

from backend.services.agent_service import agent_service
from backend.services.file_service import file_service

async def test_comprehensive_flow():
    # 1. Ingest a JSON file (simulating package-lock.json)
    test_file = "package-lock.json"
    content = b"""{
  "name": "frontend",
  "version": "0.1.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "frontend",
      "version": "0.1.0",
      "dependencies": {
        "next": "14.1.0",
        "react": "^18",
        "react-dom": "^18",
        "lucide-react": "^0.344.0"
      }
    }
  }
}"""
    print(f"Ingesting {test_file}...")
    await file_service.ingest_file(content, test_file)

    # 2. Ask about the file
    thread_id = "comp_test_thread"
    query = "What version of Next.js is used in this project?"
    print(f"\nAsking: {query}")
    
    async for chunk_json in agent_service.stream_response(query, thread_id=thread_id):
        chunk = json.loads(chunk_json)
        if chunk["type"] == "text":
            print(chunk["content"], end="", flush=True)
        elif chunk["type"] == "tool_call":
            print(f"\n[Tool Call: {chunk['content']}]")
        elif chunk["type"] == "citation":
            print(f"\n[Citation: {chunk['text']}]")

    # 3. Ask a follow-up (history test)
    query2 = "And what about React?"
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
    asyncio.run(test_comprehensive_flow())
