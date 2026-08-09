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
#
# The provider packages are imported INSIDE the branches below rather than
# at module level. Only one provider is ever selected at runtime, but a
# top-level import loads all three on every boot — three SDKs plus their
# transitive deps, on a 512MB free-tier instance, on every cold start,
# when two of them will never be called. Deferring them cuts both resident
# memory and time-to-first-request. The "one file knows the providers"
# rule above is unaffected: these are still the only such imports in the
# service, they just run later.
from langchain_core.embeddings import Embeddings
from langchain_core.language_models.chat_models import BaseChatModel

from app.core.config import settings

# OpenRouter speaks the OpenAI wire format, so the OpenAI client works
# against it unchanged — only the base URL differs. That's the whole
# reason a third provider costs a handful of lines here rather than a
# new integration.
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# The chat model id now comes from settings (GEMINI_CHAT_MODEL) so it can
# be pinned per-environment without a code change — see core/config.py.
GEMINI_EMBEDDING_MODEL = "models/text-embedding-004"


def get_chat_model(temperature: float = 0) -> BaseChatModel:
    if settings.llm_provider == "ollama":
        from langchain_ollama import ChatOllama

        return ChatOllama(
            base_url=settings.ollama_base_url,
            model=settings.ollama_chat_model,
            temperature=temperature,
        )
    if settings.llm_provider == "openrouter":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            base_url=OPENROUTER_BASE_URL,
            api_key=settings.openrouter_api_key,
            model=settings.openrouter_chat_model,
            temperature=temperature,
        )
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.gemini_chat_model,
        google_api_key=settings.gemini_api_key,
        temperature=temperature,
    )


def get_embeddings_model() -> Embeddings:
    if settings.llm_provider == "ollama":
        from langchain_ollama import OllamaEmbeddings

        return OllamaEmbeddings(
            base_url=settings.ollama_base_url,
            model=settings.ollama_embedding_model,
        )
    if settings.llm_provider == "openrouter":
        # OpenRouter is a chat-completions gateway; it has no embeddings
        # endpoint. Fail loudly rather than falling through to the Gemini
        # branch below, which would build a client with a null API key and
        # only break later, at call time, with a confusing auth error.
        #
        # Nothing calls this today (there is no vector store or RAG in the
        # app), so this raise is unreachable in practice — it exists so the
        # first person to add embeddings gets a straight answer.
        raise NotImplementedError(
            "OpenRouter does not provide embeddings. Set LLM_PROVIDER=ollama "
            "or LLM_PROVIDER=gemini if you need get_embeddings_model()."
        )
    from langchain_google_genai import GoogleGenerativeAIEmbeddings

    return GoogleGenerativeAIEmbeddings(
        model=GEMINI_EMBEDDING_MODEL,
        google_api_key=settings.gemini_api_key,
    )
