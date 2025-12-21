# AI Search Chat with PDF Citation Viewer

A Perplexity-style chat interface built with Next.js 14+ and FastAPI, featuring real-time streaming, generative UI components, and an interactive PDF viewer with citation linking.

## Features

- **Real-time Streaming**: AI responses are streamed character-by-character using Server-Sent Events (SSE).
- **Generative UI**: Dynamic UI components (charts, cards) are rendered alongside text responses.
- **Citation Linking**: Clickable citations in the chat open the source PDF in a split-view.
- **PDF Viewer**: Integrated PDF viewer with zoom and page navigation.
- **Tool Call Visualization**: Shows reasoning steps (e.g., "Searching...", "Analyzing...") during generation.

## Tech Stack

### Frontend
- **Next.js 14+** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Zustand** (State Management)
- **Framer Motion** (Animations)
- **React PDF** (PDF Rendering)
- **Lucide React** (Icons)

### Backend
- **Python 3.10+**
- **FastAPI**
- **Uvicorn**
- **PyPDF2** (PDF Processing)
- **Asyncio** (Queue System)

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.10+

### Backend Setup

1. Navigate to the project root:
   ```bash
   cd /path/to/project
   ```

2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install fastapi uvicorn pydantic python-multipart pypdf2
   ```

4. Run the server:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
   The API will be available at `http://localhost:8000`.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## Architecture Overview

1. **User Query**: User sends a message via the Chat Interface.
2. **Job Creation**: Backend creates a job ID and starts a background task.
3. **Streaming**: Frontend connects to `/api/chat/stream/{job_id}` via SSE.
4. **Generation**: Backend simulates (or performs) RAG:
   - Searches documents (Mocked).
   - Extracts text from PDFs.
   - Generates response chunks, tool calls, and citations.
   - Pushes events to the job queue.
5. **Rendering**: Frontend consumes events and updates the UI state (Zustand).
6. **Interaction**: User clicks a citation -> PDF Viewer opens in split view.

## Design Decisions

- **Asyncio Queue**: Used for simplicity to handle the job queue without external dependencies like Redis, fitting the "2-3 days" scope.
- **Zustand**: Chosen for global state management to easily share state between Chat and PDF Viewer components.
- **Server-Sent Events (SSE)**: Selected for unidirectional streaming of text and UI updates, which is efficient for this use case.






hi i need you fix the @../../FullStackAI_Project what it lacks not conversing good and thing - 

"""
Full Stack AI Developer Take-Home Assignment – Optimized Prompt

Time Estimate: 2–3 days
Stack: Next.js 14+ (App Router) + Python (FastAPI)
Project: AI Search Chat with PDF Citation Viewer & Generative UI

Goal:
Build a Perplexity-style AI chat interface where AI responses are streamed in real-time along with generative UI components, citations, and tool calls. Clicking citations transitions to a PDF viewer showing highlighted source sections. The focus is on clean design, responsive layout, smooth streaming, and polished UI/UX.

Core Features

1. Chat Interface (Perplexity-style)

Clean, centered chat layout with clear distinction between user and AI messages.

Each AI message includes:

User query

AI response with real-time streaming effect

Optional generative UI components (charts, cards, tables) rendered alongside text

Numbered inline citations [1], [2], …

Source cards below each response showing cited documents

Tool call indicators showing reasoning steps (e.g., "Searching documents…", "Analyzing results…")

2. Streaming Responses with Generative UI

Implement Server-Sent Events (SSE) for real-time streaming

Stream multiple content types:

Text chunks: Incremental AI response text

Tool calls: Show step-by-step reasoning (e.g., thinking, searching_documents, retrieving_pdf)

Generative UI components: Stream React components progressively (charts, tables, info cards) – optional but preferred

Citations: Appear inline as response generates

Show a typing indicator before streaming starts

Display step-by-step tool reasoning as executed

3. PDF Viewer with Animated Transition

Clicking a citation [1], [2], etc., triggers:

Smooth slide-in + scale/fade animation from chat to split-view layout (chat + PDF)

PDF Viewer features:

Display the source PDF

Automatically highlight & scroll to relevant section

Navigation: page up/down, zoom, search

Close button to return to chat-only view with reverse animation

Maintain chat scroll position during transitions

4. UI/UX Requirements

Chat Interface:

Minimal, clean, Perplexity-inspired design

Responsive, mobile-first layout

Clickable numbered citations [1]

Source cards below responses with document metadata

Loading states:

Typing indicator with animated dots

Streaming cursor/pulse effect

Tool call progress indicators ("Searching…", "Reading PDF…")

Generative UI components appear with smooth fade-in animations

PDF Viewer Transition:

Entry animation: smooth slide-in from right, scale/fade (300–400ms)

Exit animation: reverse of entry

Responsive:

Mobile: PDF viewer takes full screen

Desktop: Split view (60/40 chat/PDF)

Technical Requirements

Frontend (Next.js 14+)

Next.js 14+ with App Router

TypeScript with strict typing

Framer Motion for animations (transitions, generative UI reveals) – optional

react-pdf or @react-pdf-viewer/core for PDF rendering – optional

Tailwind CSS for styling

Zustand for global state (chat history, PDF viewer state) – preferred

TanStack Query (React Query) for API requests and SSE handling – preferred

Backend (Python + FastAPI)

FastAPI for REST API and SSE endpoints

Python 3.11+

Pydantic for request/response validation

Queue system for request management – optional but preferred

Redis Queue (RQ) / Celery / or in-memory asyncio.Queue

Enqueue generation requests for concurrency & rate limiting

Return job ID immediately, stream results via SSE

PDF processing:

PyPDF2 or pdfplumber for text extraction

Store PDF metadata and page-to-text mappings

Deliverables

GitHub Repository

/frontend – Next.js app

/backend – FastAPI app

docker-compose.yml – optional but recommended for full stack

README.md

Setup instructions: backend, frontend, env variables, running locally

Architecture overview: frontend ↔ backend ↔ queue flow diagram, streaming protocol

Screenshots/GIFs: tool call streaming, generative UI rendering, citation → PDF transition

Libraries used with versions & justification

Design decisions: queue system, generative UI approach, trade-offs

Code Quality

TypeScript: strict typing, no any

Python: type hints, Pydantic models

Graceful error handling

Document complex logic

Logical file structure and separation of concerns

Evaluation Criteria

Streaming Implementation (25%)

Smooth, real-time text streaming

Tool calls display correctly (optional)

Generative UI components render progressively (optional)

PDF Viewer & Transitions (20%)

Smooth animations

Accurate citation highlighting

Backend Architecture (20%)

Proper queue implementation (optional)

SSE streaming works reliably

Clean API design

Code Quality (20%)

TypeScript/Python best practices

Proper error handling

State management (Zustand + React Query) preferred

UI/UX Polish (15%)

Perplexity-style aesthetic

Responsive design

Loading states and feedback

Bonus Points (Optional)

Docker setup with docker-compose

Dark mode toggle

PDF text search highlighting

References for Guidance

Generative UI: Google Research

LangChain Generative UI React

AI SDK UI

CopilotKit Docs

LangGraph Streaming Docs

✅ Focus Tip:
Prioritize clean, working streaming chat, PDF citation handling, and smooth UI transitions. Optional features like generative UI components and queue systems are bonus, but a polished subset with correct streaming & citations is better than an incomplete full implementation.
"""

what else theme need to add and style looks more visually good and check for error 

note - 
- only change in @../../FullStackAI_Project in this directory
- you can refer for things in this directory and only read and no change is allowed here okay @../rag-practice/coldemailer-agent and others but no change anywhere

and make test to 100 diff variations for correctness

other things to add-
- the user can add file too like pdf, img, use pdf reader and give text to llm, for img only ocr type means only we read text from it using python or js whatever and give llm prompt what user want like online i do with chatgpt okay need to add in frontend the + icon too and make it better and you have permission to change in give allowed directory and also can run cmd yourself okay