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


def structured_output_kwargs() -> dict:
    # with_structured_output() has no single safe default across providers
    # — LangChain picks a method per model, not per provider, based on
    # metadata the model advertises. That auto-pick is right for Ollama
    # (native grammar-constrained decoding: json_schema mode really is
    # enforced) and for Gemini (a real structured-output API: same). It is
    # WRONG for OpenRouter's google/gemma-4-31b-it:free: the model reports
    # response_format support, so LangChain picks method="json_schema",
    # but the model doesn't actually enforce it — it answers in prose, and
    # every one of resume parsing, fit analysis and interview prep 500s
    # on a Pydantic ValidationError trying to parse that prose as JSON.
    # Verified live: json_schema fails this way; method="function_calling"
    # (tool-calling, which this model DOES support per its
    # supported_parameters) succeeds.
    #
    # So this is scoped to openrouter only. Forcing function_calling for
    # Ollama or Gemini too would trade a working, already-tuned path
    # (see the schema-fields-required note in schemas/fit.py, written
    # for Ollama's constrained decoding) for an untested one, for no
    # benefit — the bug is specific to this one provider's json_schema
    # support being unreliable, not to json_schema mode in general.
    if settings.llm_provider == "openrouter":
        return {"method": "function_calling"}
    return {}


def with_llm_retry(runnable):
    """Wraps the FINAL runnable at a call site — after
    with_structured_output(), not the bare chat model — with retry
    and exponential backoff.

    Scoped to OpenRouter only. Its free-tier shared pool 429s routinely
    under real load: one concurrent structured-output call already needed
    up to 8 attempts during testing, and resume extraction's three
    genuinely concurrent calls (see resume_extraction.py) hit this much
    harder than any single-call endpoint — reproduced live as an
    immediate, unhandled 429 on a real upload. Ollama runs locally with
    no rate limit, and Gemini hasn't shown this failure mode; retrying
    there by default would just slow down surfacing a REAL bug during
    local dev, for no benefit.

    Retrying after with_structured_output() rather than wrapping the bare
    model from get_chat_model(): with_structured_output() introspects the
    concrete model instance (tool binding, provider-specific method
    construction), and a generic RunnableRetry wrapper doesn't reliably
    expose what that introspection expects. Retrying the fully-built
    pipeline sidesteps that risk entirely.

    Backoff is sized to fit inside the 120s ceiling both callers enforce
    (NestJS's AI_REQUEST_TIMEOUT_MS, the frontend's axios timeout):
    3/6/12/20s waits across up to 5 attempts is ~41s of worst-case
    backoff, leaving real margin for the attempts' own latency.
    """
    if settings.llm_provider != "openrouter":
        return runnable
    return runnable.with_retry(
        stop_after_attempt=5,
        exponential_jitter_params={"initial": 3, "max": 20, "exp_base": 2},
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
