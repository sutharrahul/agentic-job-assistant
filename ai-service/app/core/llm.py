# This is the ONLY file in the service that should import
# ChatGoogleGenerativeAI/ChatOllama directly. Every feature that needs a
# chat model calls get_chat_model() from here instead — that's what makes
# "switch LLM provider" a single env var (LLM_PROVIDER, see
# core/config.py) instead of a find-and-replace across every file that
# happens to call an LLM.
#
# This works because LangChain gives every provider's chat class the SAME
# interface (BaseChatModel) — callers use things like
# .with_structured_output() without needing to know or care which
# provider is actually underneath.
#
# The provider packages are imported INSIDE the branches below rather than
# at module level. Only one provider is ever selected at runtime, but a
# top-level import loads both on every boot — two SDKs plus their
# transitive deps, on a 512MB free-tier instance, on every cold start,
# when one of them will never be called. Deferring them cuts both resident
# memory and time-to-first-request. The "one file knows the providers"
# rule above is unaffected: these are still the only such imports in the
# service, they just run later.
from langchain_core.language_models.chat_models import BaseChatModel

from app.core.config import settings

def get_chat_model(temperature: float = 0) -> BaseChatModel:
    if settings.llm_provider == "ollama":
        from langchain_ollama import ChatOllama

        return ChatOllama(
            base_url=settings.ollama_base_url,
            model=settings.ollama_chat_model,
            temperature=temperature,
        )
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.gemini_chat_model,
        google_api_key=settings.gemini_api_key,
        temperature=temperature,
    )


def with_llm_retry(runnable):
    """Wraps the FINAL runnable at a call site — after
    with_structured_output(), not the bare chat model — with retry
    and exponential backoff.

    Scoped to Gemini only: it's the sole hosted, rate-limited provider
    now that OpenRouter is gone. Its free tier caps requests per minute
    account-wide, and resume extraction's three genuinely concurrent
    calls (see resume_extraction.py) are the most likely place to brush
    against that ceiling — three calls from one upload, before any other
    user's traffic is even counted. Ollama runs locally with no rate
    limit; retrying there by default would just slow down surfacing a
    REAL bug during local dev, for no benefit.

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
    if settings.llm_provider != "gemini":
        return runnable
    return runnable.with_retry(
        stop_after_attempt=5,
        exponential_jitter_params={"initial": 3, "max": 20, "exp_base": 2},
    )
