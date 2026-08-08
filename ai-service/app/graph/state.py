# LangGraph passes ONE shared object — the "state" — from node to node
# through the whole pipeline. Each node reads the fields it needs and
# returns the fields it fills in; LangGraph merges that into this same
# object before calling the next node. So this class is the single
# source of truth for "everything the pipeline knows so far" (raw resume
# text, what got parsed out of it, the computed fit score, etc).
#
# TypedDict (not a Pydantic model) because LangGraph itself works with
# plain dicts internally — this just gives us autocomplete/type-checking
# without any runtime validation overhead on every node call.
# `total=False` means no field is required upfront: at the start of the
# graph only resume_text/job_description exist, and fields like
# fit_score or cover_letter only appear once the node that computes them
# has run.
from typing import TypedDict


class JobAssistantState(TypedDict, total=False):
    resume_text: str
    job_description: str
    parsed_resume: dict
    parsed_job: dict
    fit_score: float
    skill_gaps: list[str]
    cover_letter: str
