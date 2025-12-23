import os
from dotenv import load_dotenv

# Load the .env file from project root
# Adjusted path for app/config/__init__.py (two levels up) - assuming this file is in backend/core/
# backend/core/config.py -> backend/core/ -> backend/ -> .env (root of backend dir? or project root?)
# The user said ".env file from project root".
# If this file is at /home/praveen/Desktop/My_Projects/FullStackAI_Project/backend/core/config.py
# And .env is at /home/praveen/Desktop/My_Projects/FullStackAI_Project/backend/.env (based on previous view_file)
# Then it is two levels up from backend/core/ to backend/

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

class Settings:
    # Postgres
    CE_POSTGRES_HOST: str = os.environ.get("POSTGRES_HOST", "localhost")
    CE_POSTGRES_PORT: int = int(os.environ.get("POSTGRES_PORT", 5432))
    CE_POSTGRES_USER: str = os.environ.get("POSTGRES_USER", "postgres")
    CE_POSTGRES_PASSWORD: str = os.environ.get("POSTGRES_PASSWORD", "")
    CE_POSTGRES_DB: str = os.environ.get("POSTGRES_DB", "postgres")

    # Redis (optional)
    CE_REDIS_HOST: str = os.environ.get("REDIS_HOST", "localhost")
    CE_REDIS_PORT: int = int(os.environ.get("REDIS_PORT", 6379))
    CE_REDIS_DB: int = int(os.environ.get("REDIS_DB", 0))
    CE_REDIS_TTL: int = 86400  # 24 hours

    # LLM / API
    GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
    OPEN_WEATHER_API_KEY: str = os.environ.get("OPEN_WEATHER_API_KEY", "")

    GROQ_MODEL: str = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")
    GROQ_TEMPERATURE: float = float(os.environ.get("GROQ_TEMPERATURE", 0.2))

    # Chroma
    CHROMA_PERSIST_DIR: str = os.environ.get("CHROMA_PERSIST_DIR", "backend/chroma_db")

    # Embeddings
    EMBEDDING_MODEL: str = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    EMBED_CHUNK_SIZE: int = int(os.environ.get("EMBED_CHUNK_SIZE", 256))
    MAX_ROWS_SAMPLE: int = int(os.environ.get("MAX_ROWS_SAMPLE", 3))
    
    # Chat History
    CHAT_HISTORY_LIMIT: int = int(os.environ.get("CHAT_HISTORY_LIMIT", 10))

# Create a singleton settings object
settings = Settings()
