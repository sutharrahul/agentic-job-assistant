from typing import Literal

from pydantic import BaseModel


class InterviewPrepRequest(BaseModel):
    parsed_resume: dict
    # { company, job_title, description } — same shape every AI endpoint
    # gets from NestJS (see fit.py for why it isn't pre-parsed).
    parsed_job: dict
    # Optional: the stored fit analysis. When present, its missing_skills
    # are the strongest signal for which study topics to rank HIGH.
    fit_analysis: dict | None = None


# NOTE: fields used as with_structured_output schemas are REQUIRED (no
# defaults) — a default makes the field optional in the JSON schema, and
# small models under constrained decoding omit optional fields instead
# of filling them (see the longer note in schemas/fit.py).
class FocusArea(BaseModel):
    # The broad area the interview will centre on, one level ABOVE a
    # study topic: "React state management" is a focus area, "useReducer"
    # is a study topic inside it.
    area: str
    # ONE short sentence — the UI renders it inline next to the area, so
    # a paragraph here breaks the layout, not just the reading.
    why: str
    priority: Literal["HIGH", "MEDIUM", "LOW"]


class StudyTopic(BaseModel):
    topic: str
    # Groups the study list in the UI: many "Closures"/"Promises" topics
    # share the category "JavaScript".
    category: str
    priority: Literal["HIGH", "MEDIUM", "LOW"]
    # Drives what depth to study at — the same topic is a different task
    # for a fresher and for someone with five years on it.
    difficulty: Literal["BEGINNER", "INTERMEDIATE", "ADVANCED"]
    relevance: str


class ResumeQuestion(BaseModel):
    question: str
    # The exact resume item this question came from, e.g.
    # "Project: chat.rahul". This is a defence, not decoration: forcing
    # the model to name its source before writing the question is what
    # keeps it from inventing experience the candidate never had — a
    # model that must cite cannot quietly borrow the job description.
    grounded_in: str
    talking_points: list[str]


class InterviewPrepResponse(BaseModel):
    focus_areas: list[FocusArea] = []
    study_topics: list[StudyTopic] = []
    questions: list[ResumeQuestion] = []
