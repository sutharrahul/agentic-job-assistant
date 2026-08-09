# Pydantic's BaseSettings (not the same as a normal BaseModel) reads its
# field values from environment variables / the .env file automatically —
# `gemini_api_key` is populated from GEMINI_API_KEY, etc.
#
# LLM_PROVIDER picks which backend every chat/embeddings call in this
# service actually hits — see app/core/llm.py, which is the ONLY place
# that reads this field. "ollama" is the default because it's free and
# local: good for dev/testing without burning real Gemini quota. Flip to
# "gemini" (in .env, no code change) once you want the real model.
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    llm_provider: Literal["ollama", "gemini", "openrouter"] = "ollama"

    # Shared secret NestJS must present on every call — see core/security.py
    # for why this exists at all. Optional: unset means "no check", which is
    # what local development wants and what a public deployment must not
    # have. Startup logs a warning when it's missing.
    service_token: str | None = None

    # Only required when llm_provider="gemini" — see the validator below.
    # Not required at all for local Ollama-only development.
    gemini_api_key: str | None = None

    # Defaults to Google's moving "latest" alias, which is convenient but
    # means the model under you can change without warning. Pin it to a
    # dated id (e.g. gemini-2.5-flash) via GEMINI_CHAT_MODEL when you want
    # reproducible behaviour — config change, no code change.
    gemini_chat_model: str = "gemini-flash-latest"

    # OpenRouter — an OpenAI-compatible gateway in front of many models.
    # Only required when llm_provider="openrouter".
    openrouter_api_key: str | None = None

    # IMPORTANT when picking a model: three of this service's four
    # endpoints use with_structured_output(), so the model MUST support
    # tool/function calling — LangChain implements structured output over
    # function calling for OpenAI-compatible providers. Many of
    # OpenRouter's free models do not, and one without it fails resume
    # parsing, fit analysis and interview prep while cover letters (plain
    # text) still work — a confusing half-broken state that reads as a bug
    # in our code rather than a bad model choice. Check that
    # "supported_parameters" contains "tools" before changing this:
    #   curl -s https://openrouter.ai/api/v1/models
    #
    # This default is verified to advertise tools. Note it advertises
    # response_format but NOT structured_outputs, so with_structured_output
    # must stay on its function-calling path rather than json_schema.
    openrouter_chat_model: str = "google/gemma-4-31b-it:free"

    # Ollama config — only used when llm_provider="ollama". Defaults
    # assume `ollama serve` running locally with these models already
    # pulled (`ollama pull gemma3:4b`, `ollama pull nomic-embed-text`).
    ollama_base_url: str = "http://localhost:11434"
    ollama_chat_model: str = "gemma3:4b"
    ollama_embedding_model: str = "nomic-embed-text"

    @model_validator(mode="after")
    def _require_gemini_key_if_selected(self) -> "Settings":
        # Same "fail at startup, not deep inside a call" reasoning as
        # the old unconditional `gemini_api_key: str` — just scoped now
        # to only when Gemini is the actual selected provider.
        if self.llm_provider == "gemini" and not self.gemini_api_key:
            raise ValueError(
                "GEMINI_API_KEY is required when LLM_PROVIDER=gemini"
            )
        if self.llm_provider == "openrouter" and not self.openrouter_api_key:
            raise ValueError(
                "OPENROUTER_API_KEY is required when LLM_PROVIDER=openrouter"
            )
        return self


settings = Settings()
