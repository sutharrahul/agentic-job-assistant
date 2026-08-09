import json

from fastapi import APIRouter

from app.core.llm import get_chat_model
from app.schemas.fit import AnalyzeFitRequest, AnalyzeFitResponse

router = APIRouter(tags=["fit"])

_FIT_PROMPT = """You are evaluating how well a candidate's resume matches a job.

Score fit from 0-100:
- 80+ = candidate could be interviewed for this role today
- 50-79 = plausible with some gaps
- below 50 = significant mismatch

Rules:
- matched_skills: skills that appear in BOTH the resume and the job
  description (use the job's wording).
- missing_skills: skills the job asks for that the resume does NOT show.
  Only list things the job actually mentions — do not invent requirements.
- suggestions: 2-4 concrete, actionable edits to THIS resume for THIS job
  (e.g. "move project X up", "quantify the API latency win"). Never
  suggest inventing experience the candidate doesn't have.

Job:
{job}

Candidate resume (structured):
{resume}
"""


# Note: this endpoint has no idea whether its result gets cached, and
# that's deliberate — caching belongs one layer up, in NestJS's
# OrchestrationService, next to the code that owns "should we even make
# this network call." Keeping the decision there keeps this service
# stateless, which is its one job.
#
# No cache exists yet, though: see the TODO in orchestration.service.ts.
# This is the one AI call worth caching, because temperature=0 means the
# same resume and job description should always score the same.
@router.post("/analyze-fit", response_model=AnalyzeFitResponse)
async def analyze_fit(payload: AnalyzeFitRequest) -> AnalyzeFitResponse:
    # temperature=0: scoring is a judgment task, but we want the SAME
    # resume + JD pair to score the same on every call — a fit score
    # that jumps around between identical requests reads as a bug to the
    # user (and would defeat the cache described above).
    model = get_chat_model(temperature=0)

    # Same pattern as resume extraction (services/resume_extraction.py):
    # the response schema is enforced by the model integration itself,
    # so we never hand-parse LLM JSON.
    structured_model = model.with_structured_output(AnalyzeFitResponse)

    # json.dumps rather than str(): the model sees clean JSON instead of
    # Python's repr with single quotes — small models are noticeably
    # better at reading the former.
    return await structured_model.ainvoke(
        _FIT_PROMPT.format(
            job=json.dumps(payload.parsed_job, indent=2),
            resume=json.dumps(payload.parsed_resume, indent=2),
        )
    )
