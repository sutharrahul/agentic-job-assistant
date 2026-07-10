# These Pydantic models are the contract for this HTTP boundary: FastAPI
# rejects any request that doesn't match ParseResumeRequest with a 422
# before our function body even runs, and serializes whatever we return
# into ParseResumeResponse's shape. Every router file has its own
# request/response pair like this — same pattern throughout.
from pydantic import BaseModel


class ParseResumeRequest(BaseModel):
    resume_url: str


class ParseResumeResponse(BaseModel):
    raw_text: str = ""
    skills: list[str] = []
