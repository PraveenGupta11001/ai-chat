import os
from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
import pytesseract
from PIL import Image
import io
import pdfplumber
from pdf2image import convert_from_path
import cv2
import numpy as np
import subprocess

def is_tesseract_available():
    try:
        subprocess.run(["tesseract", "--version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

TESSERACT_AVAILABLE = is_tesseract_available()
from backend.core.config import settings

MAX_TEXT_CHARS = 15000 # Limit to avoid Groq token limits

class FileService:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)
        self.vector_store = Chroma(
            persist_directory=settings.CHROMA_PERSIST_DIR,
            embedding_function=self.embeddings
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.EMBED_CHUNK_SIZE,
            chunk_overlap=50
        )
        self.upload_dir = "backend/uploads"
        os.makedirs(self.upload_dir, exist_ok=True)

    async def ingest_file(self, file_content: bytes, filename: str):
        """Ingest a file (PDF, Text, Code, Image) into the vector store."""
        # Save file to disk for static serving
        file_path = os.path.join(self.upload_dir, filename)
        with open(file_path, "wb") as f:
            f.write(file_content)
            
        ext = os.path.splitext(filename)[1].lower()
        
        try:
            documents = []
            from langchain_core.documents import Document
            
            if ext == ".pdf":
                # Try pdfplumber for better text extraction
                text = ""
                with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                
                # If no text found, try OCR
                if not text.strip() and TESSERACT_AVAILABLE:
                    try:
                        images = convert_from_path(file_path)
                        for i, image in enumerate(images):
                            text += f"--- Page {i+1} ---\n"
                            text += pytesseract.image_to_string(image) + "\n"
                    except Exception as ocr_err:
                        print(f"OCR failed for PDF {filename}: {ocr_err}")
                elif not text.strip() and not TESSERACT_AVAILABLE:
                    print(f"Warning: No text found in PDF {filename} and Tesseract is not installed for OCR.")
                
                documents = [Document(page_content=text, metadata={"source": filename})]
                    
            elif ext in [".png", ".jpg", ".jpeg", ".webp"]:
                if TESSERACT_AVAILABLE:
                    image = Image.open(io.BytesIO(file_content))
                    # Preprocess image for better OCR
                    img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                    text = pytesseract.image_to_string(gray)
                    documents = [Document(page_content=text, metadata={"source": filename})]
                else:
                    print(f"Warning: Image upload attempted but Tesseract is not installed.")
                    return None
                
            elif ext in [".txt", ".md", ".py", ".js", ".ts", ".tsx", ".html", ".css", ".json"]:
                text = file_content.decode("utf-8", errors="ignore")
                documents = [Document(page_content=text, metadata={"source": filename})]
            else:
                # Default to text decoding
                text = file_content.decode("utf-8", errors="ignore")
                documents = [Document(page_content=text, metadata={"source": filename})]
                
            if not documents:
                return None

            # Truncate text if it's too long to avoid token limits
            for doc in documents:
                if len(doc.page_content) > MAX_TEXT_CHARS:
                    doc.page_content = doc.page_content[:MAX_TEXT_CHARS] + "\n\n[Note: Document truncated due to size limits]"

            texts = self.text_splitter.split_documents(documents)
            
            if texts:
                # Add to vector store
                self.vector_store.add_documents(texts)
            else:
                print(f"Warning: No text chunks generated for {filename}. Skipping vector store ingestion.")
            
            return file_path
        except Exception as e:
            print(f"Error ingesting file {filename}: {e}")
            return None

    def get_retriever(self):
        return self.vector_store.as_retriever(search_kwargs={"k": 3})

file_service = FileService()
