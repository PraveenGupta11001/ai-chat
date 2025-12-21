import asyncio
import os
import json
import random
from backend.services.agent_service import agent_service
from dotenv import load_dotenv

load_dotenv(dotenv_path="backend/.env")

QUERIES = [
    "Hello!",
    "What can you do?",
    "Do you have any documents about AI?",
    "Tell me about the uploaded PDF.",
    "Summarize the document.",
    "What is the main topic of the file?",
    "Who is the author of the document?",
    "What are the key findings?",
    "Can you find information about 'machine learning'?",
    "What does the document say about 'future trends'?",
    "Explain the concept of RAG.",
    "How does the vector store work?",
    "What is Chroma DB?",
    "Tell me a joke.",
    "What is the weather today?", # Should handle gracefully
    "How many pages are in the document?",
    "Extract the first paragraph.",
    "What is the conclusion of the report?",
    "Are there any charts in the document?",
    "What is the date of the document?",
]

# Generate 5 variations
TEST_QUERIES = QUERIES[:5]

async def run_test(query, i):
    print(f"\n[{i+1}/5] Testing query: {query}")
    try:
        has_text = False
        has_tool = False
        async for chunk in agent_service.stream_response(query):
            data = json.loads(chunk)
            if data["type"] == "text":
                has_text = True
            elif data["type"] == "tool_call":
                has_tool = True
            elif data["type"] == "error":
                print(f"  ERROR in stream: {data['content']}")
                return False
        
        print(f"  Success: Text={has_text}, Tool={has_tool}")
        return True
    except Exception as e:
        print(f"  FAILED: {e}")
        return False

async def main():
    print("Starting 5 variations stress test...")
    success_count = 0
    for i, query in enumerate(TEST_QUERIES[:5]):
        if await run_test(query, i):
            success_count += 1
        # Small delay to avoid hitting rate limits too fast
        await asyncio.sleep(0.5)
    
    print(f"\nTest Finished. Success rate: {success_count}/5")

if __name__ == "__main__":
    asyncio.run(main())
