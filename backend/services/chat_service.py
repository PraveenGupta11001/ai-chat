import asyncio
import json
from typing import AsyncGenerator

class ChatService:
    async def generate_response(self, query: str) -> AsyncGenerator[str, None]:
        # Simulate thinking/tool calls
        yield json.dumps({"type": "tool_call", "content": "Searching documents..."})
        await asyncio.sleep(1)
        yield json.dumps({"type": "tool_call", "content": "Analyzing results..."})
        await asyncio.sleep(1)

        # Simulate text response with citations
        response_text = "Based on the analysis, here is the information you requested. "
        for char in response_text:
            yield json.dumps({"type": "text", "content": char})
            await asyncio.sleep(0.02) # Faster for testing
        
        # Simulate citation
        yield json.dumps({"type": "citation", "id": 1, "text": "Source 1"})
        
        more_text = " This is supported by the data [1]. "
        for char in more_text:
            yield json.dumps({"type": "text", "content": char})
            await asyncio.sleep(0.02)

        # Simulate generative UI
        yield json.dumps({"type": "ui", "component": "chart", "data": {"labels": ["A", "B"], "values": [10, 20]}})
        
        # Final wait to ensure everything is sent
        await asyncio.sleep(0.5)

chat_service = ChatService()
