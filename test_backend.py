import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from backend.services.file_service import file_service

async def test_ingestion_and_retrieval():
    # Test with a simple text file
    test_file = "test_upload.txt"
    content = b"This is a test document about the capital of France. The capital of France is Paris."
    
    print(f"Testing ingestion of {test_file}...")
    path = await file_service.ingest_file(content, test_file)
    if path:
        print(f"Successfully ingested {test_file} to {path}")
    else:
        print(f"Failed to ingest {test_file}")
        return

    # Test retrieval
    print("\nTesting retrieval...")
    retriever = file_service.get_retriever()
    query = "What is the capital of France?"
    docs = await retriever.ainvoke(query)
    
    print(f"Query: {query}")
    print(f"Found {len(docs)} documents")
    for i, doc in enumerate(docs):
        print(f"Doc {i+1} source: {doc.metadata.get('source')}")
        print(f"Doc {i+1} content: {doc.page_content[:100]}...")

if __name__ == "__main__":
    asyncio.run(test_ingestion_and_retrieval())
