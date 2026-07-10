from pydantic import BaseModel


class GenerateCoverLetterRequest(BaseModel):
    parsed_resume: dict
    parsed_job: dict
    fit_analysis: dict | None = None


class GenerateCoverLetterResponse(BaseModel):
    cover_letter: str = ""
