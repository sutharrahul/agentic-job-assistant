"""Interview-prep pipeline — the only LangGraph in this service.

It produces two independent things: a study plan ("what should I revise
before this interview?", derived from the JOB — focus areas and the
study topics inside them, from one call) and interview questions ("what
will they ask me about MY resume?", derived from the RESUME alone).

Why a two-node graph instead of one big prompt:
1. Small models (gemma3:4b in dev) handle two focused calls far better
   than one mega-prompt trying to do both at once — and here the two
   halves have OPPOSITE rules about the job description. Topics are all
   about the job's requirements, especially the ones the candidate is
   missing; questions must never treat the job description as evidence
   the candidate has done anything. Mixing those instructions in one
   prompt is how you get "What is Tailwind CSS?" asked of a resume that
   never mentions Tailwind.
2. Each output is a separately debuggable artifact: generic topics and
   invented questions are different failures with different fixes.
3. The two nodes have no data dependency — topics need job + resume,
   questions need the resume only — so both are wired straight off
   START and LangGraph runs them CONCURRENTLY, making the endpoint cost
   one LLM round trip of latency instead of two. Fanning out from START
   and joining at END is state passing too, which is the thing LangGraph
   exists to do. Interview prep is the only feature here with a
   genuinely multi-step shape — resume parsing, fit analysis and
   cover-letter generation are each a single LLM call and live in their
   own routers, where a graph would add ceremony and nothing else.
"""

import json
from typing import TypedDict

from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel

from app.core.llm import get_chat_model, with_llm_retry
from app.schemas.interview_prep import FocusArea, ResumeQuestion, StudyTopic


# Node-to-node state for THIS pipeline only: exactly the fields these two
# nodes read and write, and nothing else. Scoping it to one graph rather
# than to a shared app-wide state type is deliberate — a catch-all state
# class would couple unrelated graphs together, and you could no longer
# tell from the type which fields a node can actually rely on being
# there. (total=False: fields appear as nodes fill them in.)
#
# The two branches write disjoint keys (focus_areas + study_topics vs
# questions), so running in parallel needs no reducer — neither can
# clobber the other.
class InterviewPrepState(TypedDict, total=False):
    parsed_resume: dict
    parsed_job: dict
    fit_analysis: dict | None
    focus_areas: list[FocusArea]
    study_topics: list[StudyTopic]
    questions: list[ResumeQuestion]


# Required, no defaults — these are with_structured_output schemas, and
# optional fields get omitted by small models (see schemas/fit.py).
#
# ONE schema for both outputs, on purpose. Focus areas and study topics
# are the same analysis at two zoom levels — both are "what does this job
# demand that this resume doesn't show?" — so asking for them together
# costs one call instead of two, and the model has to keep them
# consistent (every topic sits under an area it just named). focus_areas
# is declared FIRST so constrained decoding writes the broad areas before
# the specifics that belong inside them.
class _TopicsAndFocus(BaseModel):
    focus_areas: list[FocusArea]
    study_topics: list[StudyTopic]


class _ResumeQuestions(BaseModel):
    questions: list[ResumeQuestion]


_TOPICS_PROMPT = """You are building a study plan for a candidate about to
interview for a specific job.

Output TWO lists: the broad areas the interview will centre on, and the
concrete topics to revise inside them.

FIRST, focus_areas: 3-5 broad areas this interview will centre on.
- 3 at minimum, 5 at maximum.
- A focus area is one level ABOVE a study topic. "React state
  management" is a focus area and "useReducer" is a study topic inside
  it; "GraphQL data fetching" is a focus area and "writing resolvers" is
  a study topic inside it. Never make a single hook, keyword, function
  or config file a focus area, and never phrase one as a question.
- `why`: ONE short sentence, 15 words or fewer, saying why the interview
  will centre on this area. Exactly one sentence — no second sentence,
  no semicolons or "and also" stacking clauses onto it. The UI prints it
  inline beside the area, so a long `why` breaks the layout.
- `priority`: the same gap-weighted logic as the topic rules below — an
  area the job demands that the resume never evidences is HIGH; an area
  the resume already proves is MEDIUM or LOW.
- Every study topic you output below should belong to one of these
  areas.

SECOND, study_topics: 6-12 concrete topics this candidate should revise,
each one a THING TO LEARN — never a question, never an interview
question about the topic.

Rules for study_topics:
- Derive topics from the JOB (title, description, required and preferred
  technologies), not from the resume's contents.
- Group with `category`: the category is the umbrella technology or
  area, the topic is the specific thing inside it. Examples:
  category "JavaScript" -> topics "Closures", "Promises", "Event loop";
  category "React" -> topics "Hooks", "State management".
- Prioritise GAPS. A technology the job requires that the resume never
  mentions is HIGH priority. Something the resume already shows years of
  is LOW, or leave it out. If a fit analysis is provided, its missing
  skills are the strongest HIGH-priority signal you have.
- `difficulty` must match the candidate's seniority, which you infer
  from the resume's experience entries (how many, how long, what
  titles). Someone with 5 years of React must not be told to study
  "What is a component" — give them ADVANCED depth. A fresher must not
  be handed "React fiber internals" — give them BEGINNER foundations.
  For a technology the candidate has never used, start at the level
  their overall seniority can absorb.
- `relevance`: ONE short sentence on why this topic matters for THIS
  job. Reference what the job actually asks for.

Job:
{job}

Candidate resume (structured):
{resume}
{fit_context}
"""

_QUESTIONS_PROMPT = """You are an interviewer who has just read this
candidate's resume, and nothing else. Write the questions you would ask
them about it.

THE ONE ABSOLUTE RULE: every question must be grounded ONLY in what the
RESUME below actually contains — its real projects, employers, job
titles, responsibilities, listed technologies, achievements and
technical decisions. You have NOT been shown a job description, and if
you had, a job's requirements would still be no evidence whatsoever that
this candidate has done that thing.

Never invent experience, responsibilities, teammates or collaboration,
technologies, achievements, metrics, challenges, or technical decisions.
If the resume does not say it, it did not happen. In particular, if the
resume never mentions a team, colleagues, clients or mentoring, do not
ask anything that assumes them.

Example of the rule: if the resume never mentions Tailwind CSS, asking
"What is Tailwind CSS?" or "How have you used Tailwind?" is FORBIDDEN,
no matter what job the candidate is applying to. If the resume says a
project used Tailwind, "Tell me about a complex UI you built with
Tailwind and the challenges you hit" is valid.

WHERE QUESTIONS COME FROM, in this order:
1. One question per project listed in the resume.
2. One question per work experience entry.
3. Only if the resume still offers something concrete after that — a
   technology named inside a project, a stated achievement, a decision
   the resume describes — one more question about that specific thing.
Two questions may share a project or job only when the second one is
about a genuinely different detail of it.
Never build a question on a bare skill-list entry that no project or job
backs up. Never build one on an education entry either — a degree and an
institution give you nothing to ask about without inventing the answer,
so no `grounded_in` may start with "Education:".

For each question:
- `grounded_in`: pick the resume item FIRST, then write a question about
  it. Use exactly one of these three shapes, capital letter and colon
  included — the part after the colon MUST be copied character-for-
  character from the resume below, never from this instruction:
  "Project: <a projects[].name from the resume>" /
  "Experience: <an experience[].title> at <that entry's company>" /
  "Skill: <a skills[] entry>".
  These angle brackets are placeholders. If you emit a name that does
  not appear in the resume below, the citation is wrong and the question
  is invalid.
- `question`: ONLY the question itself, as an interviewer would speak
  it. Do NOT repeat `grounded_in` inside it and do NOT prefix it with
  "Project:" or "Experience:" — name the project or company inside the
  sentence instead. Good shapes: "Walk me through the architecture of
  <project>", "Why did you choose <tech> for <project>?", "What was the
  hardest technical problem in <project> and how did you solve it?",
  "Tell me about your role at <company>".
- `talking_points`: 2-3 facts THE RESUME ALREADY STATES that the
  candidate should bring up when answering — reminders pulled from the
  resume, not answers you have written for them. Each one is a short
  phrase CONTAINING A VERB, never a bare technology name: write "used
  Socket.IO for the real-time rooms", not "Socket.IO". Every point must
  be checkable
  against the resume text; give 2 if only 2 are supported. Do not add a
  team, a client, a metric, a tool or an outcome the resume never
  states.

HOW MANY: 6 or 7, and NEVER more than 7. Do NOT pad to reach 7. When the
sources above run out, STOP: for a thin resume, 4 well-grounded
questions is the CORRECT answer and is far better than 7 that include
invented experience. One set only — do not split technical from
behavioural.

Candidate resume (structured):
{resume}
"""


async def derive_study_topics(state: InterviewPrepState) -> InterviewPrepState:
    # temperature=0: analysis step — same study plan for the same
    # inputs, for the same reason /analyze-fit is deterministic.
    model = with_llm_retry(
        get_chat_model(temperature=0).with_structured_output(_TopicsAndFocus)
    )

    fit_context = (
        "\nFit analysis (its missing skills are HIGH priority):\n"
        + json.dumps(state.get("fit_analysis"), indent=2)
        if state.get("fit_analysis")
        else ""
    )

    result = await model.ainvoke(
        _TOPICS_PROMPT.format(
            job=json.dumps(state["parsed_job"], indent=2),
            resume=json.dumps(state["parsed_resume"], indent=2),
            fit_context=fit_context,
        )
    )
    # A node returns ONLY the fields it computed — LangGraph merges this
    # into the shared state. Two keys from ONE call: no extra node, no
    # extra round trip (see _TopicsAndFocus).
    return {
        "focus_areas": result.focus_areas,
        "study_topics": result.study_topics,
    }


async def generate_resume_questions(state: InterviewPrepState) -> InterviewPrepState:
    # Mild temperature: question WORDING can vary between regenerations,
    # but grounding rules in the prompt keep content tied to the resume.
    model = with_llm_retry(
        get_chat_model(temperature=0.4).with_structured_output(_ResumeQuestions)
    )

    # parsed_job is deliberately NOT passed to this node: the surest way
    # to stop the model treating the job's requirements as the
    # candidate's experience is to never show it the job at all.
    result = await model.ainvoke(
        _QUESTIONS_PROMPT.format(
            resume=json.dumps(state["parsed_resume"], indent=2),
        )
    )
    # Hard cap enforced in code, not just in the prompt — small models
    # overshoot "never more than 7" often enough that the contract
    # cannot rest on the prompt alone.
    return {"questions": result.questions[:7]}


def build_interview_prep_graph():
    graph = StateGraph(InterviewPrepState)
    graph.add_node("derive_study_topics", derive_study_topics)
    graph.add_node("generate_resume_questions", generate_resume_questions)
    # Both edges leave START: LangGraph runs the two nodes in the same
    # superstep, concurrently.
    graph.add_edge(START, "derive_study_topics")
    graph.add_edge(START, "generate_resume_questions")
    graph.add_edge("derive_study_topics", END)
    graph.add_edge("generate_resume_questions", END)
    return graph


# Compiled once at import time — compilation just wires the graph up
# (no LLM calls happen here), and the compiled object is stateless and
# safe to share across requests: each ainvoke gets its own state dict.
interview_prep_graph = build_interview_prep_graph().compile()
