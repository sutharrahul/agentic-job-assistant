# This is the ONLY file in the service that should import
# ChatGoogleGenerativeAI/ChatOllama (or their embeddings equivalents)
# directly. Every feature that needs a chat model or an embeddings model
# calls get_chat_model()/get_embeddings_model() from here instead —
# that's what makes "switch LLM provider" a single env var
# (LLM_PROVIDER, see core/config.py) instead of a find-and-replace
# across every file that happens to call an LLM.
#
# This works because LangChain gives every provider's chat/embeddings
# class the SAME interface (BaseChatModel / Embeddings) — callers use
# things like .with_structured_output() or .embed_query() without
# needing to know or care which provider is actually underneath.
from langchain_core.embeddings import Embeddings
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import (
    ChatGoogleGenerativeAI,
    GoogleGenerativeAIEmbeddings,
)
from langchain_ollama import ChatOllama, OllamaEmbeddings

from app.core.config import settings

# Alias model id — always points at Google's current fast/cheap model
# rather than a version that eventually gets deprecated. Assumption
# flagged for review: pin this if you want reproducible Gemini behavior.
GEMINI_CHAT_MODEL = "gemini-flash-latest"
GEMINI_EMBEDDING_MODEL = "models/text-embedding-004"


def get_chat_model(temperature: float = 0) -> BaseChatModel:
    if settings.llm_provider == "ollama":
        return ChatOllama(
            base_url=settings.ollama_base_url,
            model=settings.ollama_chat_model,
            temperature=temperature,
        )
    return ChatGoogleGenerativeAI(
        model=GEMINI_CHAT_MODEL,
        google_api_key=settings.gemini_api_key,
        temperature=temperature,
    )


def get_embeddings_model() -> Embeddings:
    if settings.llm_provider == "ollama":
        return OllamaEmbeddings(
            base_url=settings.ollama_base_url,
            model=settings.ollama_embedding_model,
        )
    return GoogleGenerativeAIEmbeddings(
        model=GEMINI_EMBEDDING_MODEL,
        google_api_key=settings.gemini_api_key,
    )
