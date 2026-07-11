from typing import Literal

from pydantic import BaseModel


class GenerateCoverLetterRequest(BaseModel):
    parsed_resume: dict
    parsed_job: dict
    # Mirrors the three tone options in the frontend's selector. Literal
    # makes FastAPI reject anything else with a clean 422 before any LLM
    # call happens.
    tone: Literal["FORMAL", "CONVERSATIONAL", "CONCISE"] = "FORMAL"
    fit_analysis: dict | None = None


class GenerateCoverLetterResponse(BaseModel):
    cover_letter: str = ""
