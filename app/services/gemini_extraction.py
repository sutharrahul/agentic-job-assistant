from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings
from app.schemas.resume import ParsedResumeData

# "gemini-flash-latest" is a Google *alias* model id — it always points at
# whatever their current fast/cheap model is, instead of a pinned
# version like "gemini-2.5-flash" that eventually gets deprecated.
# Assumption flagged for review: swap this for a pinned version name if
# you want reproducible behavior instead of "whatever's newest."
GEMINI_MODEL = "gemini-flash-latest"

_EXTRACTION_PROMPT = """You are extracting structured data from a resume.
Read the resume text below and pull out: a 1-2 sentence professional
summary, a flat list of skills (technologies, tools, languages —
not soft skills), work experience, education, and notable projects.

If a field isn't present in the resume, leave it empty rather than
guessing. Do not invent dates, employers, or skills that aren't
actually in the text.

Resume text:
---
{resume_text}
---
"""


async def extract_resume_data(resume_text: str) -> ParsedResumeData:
    # ChatGoogleGenerativeAI is LangChain's wrapper around the Gemini API
    # — it exists so the rest of this codebase (and the future LangGraph
    # pipeline for fit-scoring / cover letters) talks to one consistent
    # "chat model" interface instead of Gemini's SDK directly. Swapping
    # to a different model provider later would mean changing this one
    # constructor call, not every call site.
    #
    # temperature=0 asks the model to be as deterministic as possible —
    # appropriate here because this is an EXTRACTION task (pull out
    # what's actually on the page), not a creative one. Compare this to
    # cover-letter generation later, which will want some temperature
    # for natural-sounding prose.
    model = ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        google_api_key=settings.gemini_api_key,
        temperature=0,
    )

    # with_structured_output(ParsedResumeData) is the key piece here: it
    # takes our Pydantic schema and configures Gemini to return JSON
    # matching that exact shape (field names, types, nesting), then
    # parses the response INTO a ParsedResumeData instance for us.
    # Without this, we'd have to prompt-engineer "please respond with
    # JSON," get back a raw string, and manually json.loads() + validate
    # it ourselves — fragile, because LLMs occasionally wrap JSON in
    # markdown fences or add stray commentary. This makes malformed
    # output a LangChain-level concern instead of ours.
    structured_model = model.with_structured_output(ParsedResumeData)

    result = await structured_model.ainvoke(
        _EXTRACTION_PROMPT.format(resume_text=resume_text)
    )
    # `result` is already a ParsedResumeData instance, not a dict —
    # with_structured_output does that conversion for us.
    return result
