from typing import Annotated, Sequence, TypedDict, Union, List
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from backend.core.config import settings
from backend.services.file_service import file_service
from langchain_core.tools import create_retriever_tool
import json
import logging
import os
import asyncio

# Setup logger
logger = logging.getLogger("uvicorn.error")

# 1. Define State
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

# 2. Define Tools
# 2. Define Tools
@tool
async def search_documents(query: str):
    """Searches and returns excerpts from the uploaded documents (PDFs, images, docx, text, code, md, json). 
    Use this to answer questions based on the document content. 
    Always cite your sources using [1], [2], etc. based on the filenames provided in the search results."""
    if not query or len(query.strip()) < 2:
        logger.warning("DEBUG: Empty or too short query provided to search_documents")
        return "Please provide a more specific search query to find information in the documents."
        
    logger.info(f"DEBUG: Searching documents for query: '{query}'")
    retriever = file_service.get_retriever()
    try:
        docs = await retriever.ainvoke(query)
        logger.info(f"DEBUG: Retriever returned {len(docs)} documents")
    except Exception as e:
        logger.error(f"DEBUG: Retriever error: {e}")
        return f"Error searching documents: {e}"
    
    if not docs:
        logger.warning(f"DEBUG: No documents found for query: '{query}'")
        return "No relevant information found in the uploaded documents for this specific query. Try a different search term or use list_documents to see what's available."
    
    results = []
    for i, doc in enumerate(docs):
        source = doc.metadata.get("source", "unknown")
        content = doc.page_content
        logger.info(f"DEBUG: Found doc {i+1} from {source} (length: {len(content)})")
        results.append(f"Source: {source}\nContent: {content}")
    
    return "\n\n---\n\n".join(results)

@tool
async def list_documents():
    """Returns a list of all documents currently uploaded and available in the system. 
    Use this when the user asks what files they have uploaded or to see a list of available documents."""
    logger.info("DEBUG: Listing all documents")
    # This is a bit tricky with Chroma as a retriever, but we can get all unique sources from the vector store
    # For now, we'll use a simpler approach: list files in the uploads directory
    try:
        files = os.listdir("backend/uploads")
        if not files:
            return "No documents have been uploaded yet."
        return "Currently uploaded documents:\n" + "\n".join([f"- {f}" for f in files])
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        return "Error retrieving document list."

tools = [search_documents, list_documents]

# 3. Define Model
model = ChatGroq(
    temperature=settings.GROQ_TEMPERATURE,
    model_name=settings.GROQ_MODEL,
    api_key=settings.GROQ_API_KEY,
    streaming=True
)
model = model.bind_tools(tools)

# 4. Define Nodes
async def agent(state: AgentState, config):
    messages = state["messages"]
    thread_id = config.get("configurable", {}).get("thread_id", "unknown")
    print(f"DEBUG: Agent node - thread_id: {thread_id}, message count: {len(messages)}")
    
    # Always prepend system message for every model call to ensure instructions are followed
    system_prompt = SystemMessage(content="""You are a professional AI assistant for searching and analyzing uploaded documents.
Your goal is to provide accurate, concise, and well-formatted answers.

1. **Search Strategy**: 
   - If the question is a clear general knowledge question (e.g., "What is potassium?", "Who is Einstein?", "How many planets are there?") that is obviously unrelated to the documents, ANSWER DIRECTLY from your own knowledge. DO NOT use `search_documents`.
   - If the question is about the uploaded documents, or if you are unsure if the documents contain the answer, ALWAYS use the `search_documents` tool first.
   - If you search and find no relevant information, answer using your own knowledge but mention that the documents didn't contain the info.
2. **List Documents**: Use the `list_documents` tool if the user asks what files are available.
3. **Citations**: Always cite your sources using [1], [2], etc. when using information from the documents.
4. **Tone**: Maintain a helpful, professional, and friendly tone.
5. **Formatting**: Use Markdown (bold, lists, code blocks) for clarity.
6. **Images**: If the user asks about an image, explain that you can currently only see the filename and metadata.""")
    
    messages_with_system = [system_prompt] + messages
    
    try:
        response = await model.ainvoke(messages_with_system, config=config)
        return {"messages": [response]}
    except Exception as e:
        error_msg = str(e)
        if "rate_limit" in error_msg.lower() or "429" in error_msg:
            return {"messages": [AIMessage(content="I'm sorry, but I've reached my rate limit for now. Please try again in a few moments.")]}
        raise e

def should_continue(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]
    if last_message.tool_calls:
        return "tools"
    return END

# 5. Define Graph
workflow = StateGraph(AgentState)

workflow.add_node("agent", agent)
workflow.add_node("tools", ToolNode(tools))

workflow.set_entry_point("agent")

workflow.add_conditional_edges(
    "agent",
    should_continue,
    {
        "tools": "tools",
        END: END
    }
)

workflow.add_edge("tools", "agent")

memory = MemorySaver()
app = workflow.compile(checkpointer=memory)

class AgentService:
    async def stream_response(self, query: str, thread_id: str = "default"):
        inputs = {"messages": [HumanMessage(content=query)]}
        config = {"configurable": {"thread_id": thread_id}, "recursion_limit": 50}
        citation_count = 0
        seen_citations = set()
        
        # Yield an initial thinking status
        yield json.dumps({"type": "tool_call", "content": "Thinking..."})
        
        text_yielded = False
        last_yield_time = asyncio.get_event_loop().time()
        
        async for event in app.astream_events(inputs, version="v2", config=config):
            kind = event["event"]
            
            if kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    text_yielded = True
                    last_yield_time = asyncio.get_event_loop().time()
                    yield json.dumps({"type": "text", "content": content})
            
            elif kind == "on_chat_model_end":
                output = event["data"].get("output")
                if output and not text_yielded:
                    content = getattr(output, "content", None)
                    if content:
                        text_yielded = True
                        last_yield_time = asyncio.get_event_loop().time()
                        yield json.dumps({"type": "text", "content": content})
            
            elif kind == "on_tool_start":
                tool_name = event["name"]
                status_msg = "Searching documents..." if tool_name == "search_documents" else f"Using {tool_name}..."
                yield json.dumps({"type": "tool_call", "content": status_msg})
                last_yield_time = asyncio.get_event_loop().time()
            
            elif kind == "on_tool_end":
                if event["name"] == "search_documents":
                    output = event["data"].get("output")
                    if output and isinstance(output, str):
                        import re
                        sources = re.findall(r"Source: (.*?)\n", output)
                        for source in sources:
                            filename = os.path.basename(source)
                            if filename not in seen_citations:
                                citation_count += 1
                                seen_citations.add(filename)
                                yield json.dumps({
                                    "type": "citation", 
                                    "id": citation_count, 
                                    "text": filename, 
                                    "link": filename
                                })
                last_yield_time = asyncio.get_event_loop().time()

            # Heartbeat check (if needed, but astream_events is usually busy)
            # If we wanted a real heartbeat, we'd need a separate task or a more complex loop

agent_service = AgentService()
