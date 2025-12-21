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

# 1. Define State
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

# 2. Define Tools
retriever = file_service.get_retriever()
retriever_tool = create_retriever_tool(
    retriever,
    "search_documents",
    "Searches and returns excerpts from the uploaded documents (PDFs, images, text, code). Use this to answer questions based on the document content. Always cite your sources using [1], [2], etc."
)

tools = [retriever_tool]

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
    system_prompt = SystemMessage(content="""You are a helpful AI assistant. 
Use the search_documents tool to answer questions about uploaded files. 
Always cite your sources using [1], [2], etc. based on the tool output.
If the tool returns no results, inform the user that you couldn't find relevant information in the uploaded documents.
Maintain a conversational tone and remember previous parts of the chat.""")
    
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
        
        async for event in app.astream_events(inputs, version="v1", config=config):
            kind = event["event"]
            
            if kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield json.dumps({"type": "text", "content": content})
            
            elif kind == "on_tool_start":
                tool_name = event["name"]
                if tool_name == "search_documents":
                    yield json.dumps({"type": "tool_call", "content": "Searching documents"})
                else:
                    yield json.dumps({"type": "tool_call", "content": f"Using {tool_name}"})
            
            elif kind == "on_tool_end":
                # Check if it's the retriever tool to extract citations
                if event["name"] == "search_documents":
                    output = event["data"].get("output")
                    if output:
                        print(f"DEBUG: Retriever output: {output}") # Added logging
                        # yield json.dumps({"type": "tool_call", "content": "Analyzed documents."}) # Removed to reduce chatter
                        
                        # Extract documents from output
                        docs = []
                        if isinstance(output, list):
                            docs = output
                        elif hasattr(output, "documents"):
                            docs = output.documents
                        
                        for doc in docs:
                            metadata = getattr(doc, "metadata", {})
                            source = metadata.get("source", "source_document.pdf")
                            # Get only the basename
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

agent_service = AgentService()
