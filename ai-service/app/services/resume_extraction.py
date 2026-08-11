import asyncio

from pydantic import BaseModel

from app.core.llm import get_chat_model, structured_output_kwargs, with_llm_retry
from app.schemas.resume import (
    EducationEntry,
    ExperienceEntry,
    ParsedResumeData,
    ProjectEntry,
)

# Three focused schemas instead of one call asking for all five fields at
# once — the same reasoning as the two-node interview-prep graph
# (app/graph/interview_prep.py): a single call combining a long resume
# with a five-field nested schema reliably returns an EMPTY result for
# gemma3:4b under Ollama on any real-world resume long enough to have
# real content. Reproduced directly against a live upload: the raw model
# response was the literal string "{}" — not garbled output, not a
# partial match, a model that gave up on the combined task entirely, and
# did so deterministically across repeated identical calls (not a
# stochastic fluke a retry would fix).
#
# Splitting the SAME long resume into three narrower calls — each with a
# schema of one or two fields — fixed it completely: a full skills list,
# an accurate summary, and correctly-detailed experience entries, all
# from the exact input that produced "{}" as one call. Every field below
# is required with no default for the same reason schemas/fit.py's are:
# an optional field is exactly the kind of thing a small model omits
# under constrained decoding, and Pydantic would silently accept that as
# "no experience" instead of surfacing it as a real gap.
class _SummarySkills(BaseModel):
    summary: str
    skills: list[str]


class _Experience(BaseModel):
    experience: list[ExperienceEntry]


class _EducationProjects(BaseModel):
    education: list[EducationEntry]
    projects: list[ProjectEntry]


_SUMMARY_SKILLS_PROMPT = """Read the resume text below and extract:
- summary: a 1-2 sentence professional summary
- skills: a flat list of skills (technologies, tools, languages — not soft skills)

If nothing is present for a field, return an empty string or empty list
rather than guessing. Do not invent skills that aren't in the text.

Resume text:
---
{resume_text}
---
"""

_EXPERIENCE_PROMPT = """Read the resume text below and extract every work
experience entry: title, company, start_date, end_date, description.

If there is no work experience section, return an empty list rather than
guessing. Do not invent employers or dates that aren't in the text.

Resume text:
---
{resume_text}
---
"""

_EDUCATION_PROJECTS_PROMPT = """Read the resume text below and extract:
- education: every entry (degree, institution, start_date, end_date)
- projects: every notable project (name, description, technologies)

If a section isn't present, return an empty list for it rather than
guessing. Do not invent institutions, dates, or projects that aren't in
the text.

Resume text:
---
{resume_text}
---
"""


async def extract_resume_data(resume_text: str) -> ParsedResumeData:
    # get_chat_model() returns whichever provider LLM_PROVIDER selects
    # (see app/core/llm.py) — this function has no idea whether it's
    # talking to Ollama, Gemini, or OpenRouter, and doesn't need to.
    #
    # temperature=0 asks the model to be as deterministic as possible —
    # appropriate here because this is an EXTRACTION task (pull out
    # what's actually on the page), not a creative one.
    #
    # The three calls run concurrently, not sequentially: unlike
    # interview-prep's two nodes, none of these depends on another's
    # output — they're three independent reads of the same input text,
    # so there's no reason to pay for their latency one after another.
    model = get_chat_model(temperature=0)
    kwargs = structured_output_kwargs()

    # with_llm_retry matters more here than at any other call site: these
    # three calls run concurrently against the same rate-limited pool, so
    # they're more likely to collide with each other's requests than a
    # single-call endpoint ever would be.
    summary_skills_model = with_llm_retry(
        model.with_structured_output(_SummarySkills, **kwargs)
    )
    experience_model = with_llm_retry(
        model.with_structured_output(_Experience, **kwargs)
    )
    education_projects_model = with_llm_retry(
        model.with_structured_output(_EducationProjects, **kwargs)
    )

    summary_skills, experience, education_projects = await asyncio.gather(
        summary_skills_model.ainvoke(
            _SUMMARY_SKILLS_PROMPT.format(resume_text=resume_text)
        ),
        experience_model.ainvoke(_EXPERIENCE_PROMPT.format(resume_text=resume_text)),
        education_projects_model.ainvoke(
            _EDUCATION_PROJECTS_PROMPT.format(resume_text=resume_text)
        ),
    )

    return ParsedResumeData(
        summary=summary_skills.summary or None,
        skills=summary_skills.skills,
        experience=experience.experience,
        education=education_projects.education,
        projects=education_projects.projects,
    )
