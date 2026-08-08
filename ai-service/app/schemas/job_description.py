from pydantic import BaseModel


class ParseJobDescriptionRequest(BaseModel):
    job_description: str


class ParseJobDescriptionResponse(BaseModel):
    title: str | None = None
    required_skills: list[str] = []
