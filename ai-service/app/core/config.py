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

    llm_provider: Literal["ollama", "gemini"] = "ollama"

    # Shared secret NestJS must present on every call — see core/security.py
    # for why this exists at all. Optional: unset means "no check", which is
    # what local development wants and what a public deployment must not
    # have. Startup logs a warning when it's missing.
    service_token: str | None = None

    # Only required when llm_provider="gemini" — see the validator below.
    # Not required at all for local Ollama-only development.
    gemini_api_key: str | None = None

    # Pinned to the lightest Gemini tier rather than the moving "latest"
    # alias: flash-lite carries the highest free-tier request quota of
    # any Gemini model, which matters most here since resume extraction
    # (services/resume_extraction.py) fires three concurrent calls per
    # upload. Override via GEMINI_CHAT_MODEL — config change, no code
    # change — if you ever want the heavier gemini-2.5-flash instead.
    gemini_chat_model: str = "gemini-3.5-flash-lite"

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
        return self


settings = Settings()
