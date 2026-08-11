from app.core.llm import get_chat_model, structured_output_kwargs
from app.schemas.resume import ParsedResumeData

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
    # get_chat_model() returns whichever provider LLM_PROVIDER selects
    # (see app/core/llm.py) — this function has no idea whether it's
    # talking to Ollama or Gemini, and doesn't need to.
    #
    # temperature=0 asks the model to be as deterministic as possible —
    # appropriate here because this is an EXTRACTION task (pull out
    # what's actually on the page), not a creative one. Compare this to
    # cover-letter generation later, which will want some temperature
    # for natural-sounding prose.
    model = get_chat_model(temperature=0)

    # with_structured_output(ParsedResumeData) is the key piece here: it
    # takes our Pydantic schema and configures the model to return JSON
    # matching that exact shape (field names, types, nesting), then
    # parses the response INTO a ParsedResumeData instance for us.
    # Without this, we'd have to prompt-engineer "please respond with
    # JSON," get back a raw string, and manually json.loads() + validate
    # it ourselves — fragile, because LLMs occasionally wrap JSON in
    # markdown fences or add stray commentary. This makes malformed
    # output a LangChain-level concern instead of ours. Both providers
    # implement this the same way from the caller's side, though the
    # underlying mechanism differs per provider — including, as of
    # structured_output_kwargs() in core/llm.py, one provider (OpenRouter)
    # whose auto-picked mechanism turned out not to work and had to be
    # overridden. This function still doesn't know which; that override
    # lives in the one file that's allowed to know.
    structured_model = model.with_structured_output(
        ParsedResumeData, **structured_output_kwargs()
    )

    result = await structured_model.ainvoke(
        _EXTRACTION_PROMPT.format(resume_text=resume_text)
    )
    # `result` is already a ParsedResumeData instance, not a dict —
    # with_structured_output does that conversion for us.
    return result
