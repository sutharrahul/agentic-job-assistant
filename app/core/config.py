# Pydantic's BaseSettings (not the same as a normal BaseModel) reads its
# field values from environment variables / the .env file automatically —
# `gemini_api_key` is populated from GEMINI_API_KEY. Because it's required
# (no default value), the app refuses to start if the key is missing,
# instead of failing later, deep inside a Gemini API call, with a
# confusing error.
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    gemini_api_key: str


settings = Settings()
