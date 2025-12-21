import asyncio
import os
from backend.services.agent_service import agent_service
from dotenv import load_dotenv

load_dotenv(dotenv_path="backend/.env")

async def main():
    print("Starting reproduction test...")
    # Query that triggers the retriever tool
    query = "tell me if you have anydocument" 
    try:
        async for chunk in agent_service.stream_response(query):
            print(f"CHUNK: {chunk}")
    except Exception as e:
        print(f"\nERROR CAUGHT: {e}")
    print("\nFinished.")

if __name__ == "__main__":
    asyncio.run(main())
