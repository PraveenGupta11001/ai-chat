# AI Search Chat with PDF Citation Viewer

A lightweight **Perplexity‑style** chat application that streams AI responses in real‑time, displays tool‑call progress, and lets users view source PDFs with clickable citations. The UI is polished with a dark/light theme, borderless input, subtle shadows, and smooth animations.

<img width="1919" height="993" alt="image" src="https://github.com/user-attachments/assets/a8502907-01c8-40df-8e24-f6d8468812b0" />

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Setup & Installation](#setup--installation)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Features
- **Real‑time SSE streaming** – AI replies appear character‑by‑character with an immediate *Thinking…* indicator.
- **Tool‑call visualization** – Shows steps such as *Searching documents…* or *Using <tool>* while the model works.
- **Citation linking** – Inline `[1]` style citations open the corresponding PDF in a split‑view viewer.
- **General‑knowledge handling** – The agent answers pure factual questions directly without unnecessary document searches.
- **Theme synchronization** – Dark and light modes stay consistent across all components (bubbles, buttons, input field).
- **Premium UI** – Borderless input box, subtle backdrop‑blur shadows, smooth hover/active animations.
- **Data retention** – Background task clears uploaded files and vector store every hour.
- **Health‑check** – `/api/health` endpoint pinged every 14 minutes to keep the connection alive.
- **File support** – Upload and search `.pdf`, `.txt`, `.md`, `.json`, `.docx`, `.xml`, and image files (OCR via EasyOCR).

---

## Tech Stack
**Frontend**
- **Next.js 14** (App Router) – React framework with server‑side rendering.
- **TypeScript** – Strict typing for safety.
- **Tailwind CSS** – Utility‑first styling.
- **Zustand** – Global state management (chat history, theme, PDF viewer).
- **Framer Motion** – Animations for UI transitions.
- **React‑PDF** – PDF rendering inside the viewer.
- **Lucide React** – Icon set.

**Backend**
- **Python 3.11+** – Core language.
- **FastAPI** – High‑performance API server.
- **Uvicorn** – ASGI server.
- **LangChain (Groq)** – LLM integration with streaming support.
- **LangGraph** – Graph‑based agent workflow.
- **Asyncio Queue** – Simple in‑process job queue (no external broker).
- **Chroma** – Vector store for document embeddings.
- **EasyOCR** – OCR for image uploads.
- **pdfplumber** – PDF text extraction.

---

## Architecture Overview
1. **User Query** – Sent from the chat UI to `POST /api/chat/`.
2. **Job Creation** – Backend generates a unique `job_id` and starts an async task.
3. **Streaming** – The task yields events (`text`, `tool_call`, `citation`) via **Server‑Sent Events** (`GET /api/chat/stream/{job_id}`).
4. **Frontend Consumption** – The client listens to SSE, updates the chat bubble, shows tool‑call status, and adds citations.
5. **PDF Viewer** – Clicking a citation opens the PDF viewer (split‑view on desktop, full‑screen on mobile) and scrolls to the relevant page.
6. **Background Tasks** –
   - **Data Retention** – Every hour, `file_service.reset_vector_store()` clears uploads and vector data.
   - **Health Check** – Every 14 minutes the frontend pings `/api/health` to keep the server warm.

---

## Setup & Installation
### Prerequisites
- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Git**
- **Virtual environment** (recommended)

### Backend
```bash
# Clone the repo (if you haven't already)
git clone https://github.com/yourusername/FullStackAI_Project.git
cd FullStackAI_Project

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt   # or pip install fastapi uvicorn langchain-groq langgraph chromadb easyocr pdfplumber

# Run the server (default port 8000)
uvicorn backend.main:app --reload --port 8000
```
The backend will be reachable at `http://localhost:8000`.

### Frontend
```bash
cd frontend
npm install
npm run dev   # defaults to http://localhost:3000
```
The UI will automatically open in your default browser.

---

## Running the Application
1. **Start the backend** (see above). Ensure the virtual environment is active.
2. **Start the frontend** (`npm run dev`).
3. Open `http://localhost:3000` in a browser.
4. Upload documents via the **+** button, then ask questions.
5. Click citation numbers to view source PDFs.

---

## Testing
The repository includes a few test scripts:
- `test_backend.py` – sanity checks for the health endpoint and file upload.
- `test_refinements.py` – verifies general‑knowledge handling and citation extraction.
Run them with:
```bash
pytest test_backend.py test_refinements.py
```
All tests should pass (`0 failures`).

---

## Project Structure
```
FullStackAI_Project/
├─ backend/                # FastAPI server
│   ├─ api/                # Routers (chat, file)
│   ├─ core/               # Settings & config
│   ├─ services/           # FileService, AgentService
│   └─ main.py
├─ frontend/               # Next.js app
│   ├─ src/components/     # ChatInterface, MessageBubble, PDFViewer
│   ├─ src/lib/            # Zustand store, utils
│   └─ tailwind.config.js
├─ chroma_db/              # Vector store files (generated)
├─ README.md               # This document
└─ requirements.txt        # Python deps
```

---

## Contributing
Contributions are welcome! Please:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome-feature`).
3. Ensure code follows existing style (TypeScript strict, Python type hints).
4. Run tests (`pytest`).
5. Open a Pull Request with a clear description.

---

## License
This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---

*Enjoy building and extending the AI Search Chat! 🚀*
