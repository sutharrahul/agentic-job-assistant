"""Interview-prep pipeline — the only LangGraph in this service.

Why a two-node graph instead of one big prompt:
1. Small models (gemma3:4b in dev) handle "figure out what matters, THEN
   write questions about it" much better as two focused calls than as
   one mega-prompt trying to do both at once.
2. The intermediate result (focus_areas) is a visible, debuggable
   artifact — if the questions come out generic, you can check whether
   the problem was picking the wrong focus areas (node 1) or writing bad
   questions about the right ones (node 2).
3. The handoff between the two nodes IS state passing, which is the thing
   LangGraph exists to do. Interview prep is the only feature here with a
   genuinely multi-step shape — resume parsing, fit analysis and
   cover-letter generation are each a single LLM call and live in their
   own routers, where a graph would add ceremony and nothing else.
"""

import json
from typing import TypedDict

from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel

from app.core.llm import get_chat_model, structured_output_kwargs, with_llm_retry
from app.schemas.interview_prep import InterviewQuestion, QuestionSet


# Node-to-node state for THIS pipeline only: exactly the fields these two
# nodes read and write, and nothing else. Scoping it to one graph rather
# than to a shared app-wide state type is deliberate — a catch-all state
# class would couple unrelated graphs together, and you could no longer
# tell from the type which fields a node can actually rely on being
# there. (total=False: fields appear as nodes fill them in.)
class InterviewPrepState(TypedDict, total=False):
    parsed_resume: dict
    parsed_job: dict
    fit_analysis: dict | None
    focus_areas: list[str]
    gaps_to_prepare: list[str]
    technical_questions: list[InterviewQuestion]
    behavioral_questions: list[InterviewQuestion]


class _FocusAreas(BaseModel):
    # Required, no defaults — this is a with_structured_output schema,
    # and optional fields get omitted by small models (see schemas/fit.py).
    #
    # 3-5 themes the interview will likely revolve around, e.g.
    # "React state management at scale", "SQL schema design".
    focus_areas: list[str]
    # Skills the job wants that this candidate is weakest on — the
    # honest "study this before the interview" list.
    gaps_to_prepare: list[str]


_FOCUS_PROMPT = """You are prepping a candidate for a job interview.

From the job and resume below, identify:
- focus_areas: 3-5 specific technical/role themes this interview will
  most likely center on. Base them on what the JOB emphasizes, filtered
  by what the candidate claims — those intersections are what
  interviewers probe.
- gaps_to_prepare: skills or topics the job wants that the resume shows
  little or no evidence of. These are what the candidate should study
  before the interview. If a fit analysis is provided, its missing
  skills belong here.

Job:
{job}

Candidate resume (structured):
{resume}
{fit_context}
"""

_QUESTIONS_PROMPT = """You are writing interview prep questions for a candidate.

The interview will likely focus on: {focus_areas}

Write:
- technical_questions: 4-5 questions an interviewer at this company
  would realistically ask about those focus areas.
- behavioral_questions: 3 questions about teamwork, ownership, or
  challenges, tied to this specific role.

For EVERY question, give 2-3 talking_points the candidate can answer
with — each one grounded in a concrete item from THEIR resume below
(name the actual project or experience). If the resume has nothing
relevant, the talking point should say what to honestly acknowledge and
pivot to. Never invent experience.

Job title: {job_title} at {company}

Candidate resume (structured):
{resume}
"""


async def derive_focus_areas(state: InterviewPrepState) -> InterviewPrepState:
    # temperature=0: analysis step — same focus areas for the same
    # inputs, for the same reason /analyze-fit is deterministic.
    model = with_llm_retry(
        get_chat_model(temperature=0).with_structured_output(
            _FocusAreas, **structured_output_kwargs()
        )
    )

    fit_context = (
        "\nFit analysis (missing skills -> gaps_to_prepare):\n"
        + json.dumps(state.get("fit_analysis"), indent=2)
        if state.get("fit_analysis")
        else ""
    )

    result = await model.ainvoke(
        _FOCUS_PROMPT.format(
            job=json.dumps(state["parsed_job"], indent=2),
            resume=json.dumps(state["parsed_resume"], indent=2),
            fit_context=fit_context,
        )
    )
    # A node returns ONLY the fields it computed — LangGraph merges this
    # into the shared state before the next node runs.
    return {
        "focus_areas": result.focus_areas,
        "gaps_to_prepare": result.gaps_to_prepare,
    }


async def generate_questions(state: InterviewPrepState) -> InterviewPrepState:
    # Mild temperature: question WORDING can vary between regenerations,
    # but grounding rules in the prompt keep content tied to the resume.
    model = with_llm_retry(
        get_chat_model(temperature=0.4).with_structured_output(
            QuestionSet, **structured_output_kwargs()
        )
    )

    job = state["parsed_job"]
    result = await model.ainvoke(
        _QUESTIONS_PROMPT.format(
            # Reads the field node 1 just wrote — this handoff is the
            # whole reason these are two nodes in one graph rather than
            # two unrelated endpoints.
            focus_areas=", ".join(state.get("focus_areas", [])),
            job_title=job.get("job_title", ""),
            company=job.get("company", ""),
            resume=json.dumps(state["parsed_resume"], indent=2),
        )
    )
    return {
        "technical_questions": result.technical_questions,
        "behavioral_questions": result.behavioral_questions,
    }


def build_interview_prep_graph():
    graph = StateGraph(InterviewPrepState)
    graph.add_node("derive_focus_areas", derive_focus_areas)
    graph.add_node("generate_questions", generate_questions)
    graph.add_edge(START, "derive_focus_areas")
    graph.add_edge("derive_focus_areas", "generate_questions")
    graph.add_edge("generate_questions", END)
    return graph


# Compiled once at import time — compilation just wires the graph up
# (no LLM calls happen here), and the compiled object is stateless and
# safe to share across requests: each ainvoke gets its own state dict.
interview_prep_graph = build_interview_prep_graph().compile()
