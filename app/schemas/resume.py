# These Pydantic models are the contract for this HTTP boundary: FastAPI
# rejects any request that doesn't match ParseResumeRequest with a 422
# before our function body even runs, and serializes whatever we return
# into ParseResumeResponse's shape. Every router file has its own
# request/response pair like this — same pattern throughout.
#
# ParsedResumeData specifically is the CANONICAL shape for a parsed
# resume across all three services: this is what Gemini is asked to
# return, what NestJS stores verbatim in Prisma's `Resume.parsedData`
# Json column, and what the Next.js preview form edits. Keeping one
# shared shape (instead of three slightly-different ones) is what lets
# NestJS pass the JSON straight through without reshaping it.
from pydantic import BaseModel


class ExperienceEntry(BaseModel):
    title: str
    company: str
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None


class EducationEntry(BaseModel):
    degree: str
    institution: str
    start_date: str | None = None
    end_date: str | None = None


class ProjectEntry(BaseModel):
    name: str
    description: str | None = None
    technologies: list[str] = []


class ParsedResumeData(BaseModel):
    summary: str | None = None
    skills: list[str] = []
    experience: list[ExperienceEntry] = []
    education: list[EducationEntry] = []
    projects: list[ProjectEntry] = []


class ParseResumeRequest(BaseModel):
    resume_url: str


class ParseResumeResponse(BaseModel):
    parsed: ParsedResumeData
