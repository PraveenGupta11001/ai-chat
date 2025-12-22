import asyncio
import os
import sys
import json

# Add project root to path
sys.path.append(os.getcwd())

from backend.services.agent_service import agent_service
from backend.services.file_service import file_service

async def test_refinements():
    # 1. Reset
    print("Resetting database...")
    file_service.reset_vector_store()
    
    # 2. Ingest an XML file
    xml_name = "catalog.xml"
    xml_content = b'<?xml version="1.0"?><catalog><book id="bk101"><author>Gambardella, Matthew</author><title>XML Developers Guide</title></book></catalog>'
    print(f"Ingesting {xml_name}...")
    await file_service.ingest_file(xml_content, xml_name)
    await asyncio.sleep(1)

    # 3. Ask about the XML
    thread_id = "refinement_test_thread"
    query1 = "Who is the author of the book in the catalog?"
    print(f"\nAsking: {query1}")
    
    async for chunk_json in agent_service.stream_response(query1, thread_id=thread_id):
        chunk = json.loads(chunk_json)
        if chunk["type"] == "text":
            print(chunk["content"], end="", flush=True)
        elif chunk["type"] == "tool_call":
            print(f"\n[Tool Call: {chunk['content']}]")

    # 4. Ask a general knowledge question
    thread_id_gk = "gk_test_thread"
    query2 = "What is potassium?"
    print(f"\n\nAsking: {query2}")
    
    response_received = False
    async for chunk_json in agent_service.stream_response(query2, thread_id=thread_id_gk):
        chunk = json.loads(chunk_json)
        if chunk["type"] == "text":
            print(chunk["content"], end="", flush=True)
            response_received = True
        elif chunk["type"] == "tool_call":
            print(f"\n[Tool Call: {chunk['content']}]")
    
    if not response_received:
        print("\nDEBUG: No text response received for general knowledge query.")
    print("\n")

if __name__ == "__main__":
    asyncio.run(test_refinements())
