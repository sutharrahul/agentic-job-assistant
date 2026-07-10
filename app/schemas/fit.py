from pydantic import BaseModel


class AnalyzeFitRequest(BaseModel):
    parsed_resume: dict
    parsed_job: dict


class AnalyzeFitResponse(BaseModel):
    fit_score: float = 0.0
    skill_gaps: list[str] = []
