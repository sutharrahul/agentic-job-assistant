from pydantic import BaseModel


class InterviewPrepRequest(BaseModel):
    parsed_resume: dict
    # { company, job_title, description } — same shape every AI endpoint
    # gets from NestJS (see fit.py for why it isn't pre-parsed).
    parsed_job: dict
    # Optional: the stored fit analysis. When present, its missing_skills
    # feed straight into "gaps to prepare" instead of being re-derived.
    fit_analysis: dict | None = None


# NOTE: fields used as with_structured_output schemas are REQUIRED (no
# defaults) — a default makes the field optional in the JSON schema, and
# small models under constrained decoding omit optional fields instead
# of filling them (see the longer note in schemas/fit.py).
class InterviewQuestion(BaseModel):
    question: str
    # Bullet points the candidate can answer WITH — grounded in their
    # actual resume (projects, freelance work), not generic advice.
    talking_points: list[str]


# Also used as a with_structured_output schema in the graph's second
# node — see graph/interview_prep.py.
class QuestionSet(BaseModel):
    technical_questions: list[InterviewQuestion]
    behavioral_questions: list[InterviewQuestion]


class InterviewPrepResponse(BaseModel):
    focus_areas: list[str] = []
    technical_questions: list[InterviewQuestion] = []
    behavioral_questions: list[InterviewQuestion] = []
    gaps_to_prepare: list[str] = []
