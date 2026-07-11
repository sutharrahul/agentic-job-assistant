import json

from fastapi import APIRouter

from app.core.llm import get_chat_model
from app.schemas.cover_letter import (
    GenerateCoverLetterRequest,
    GenerateCoverLetterResponse,
)

router = APIRouter(tags=["cover-letter"])

# Each tone maps to concrete writing instructions rather than just the
# tone's name — "be formal" means little to a small model, "no
# contractions, sign off with Sincerely" is checkable.
_TONE_INSTRUCTIONS = {
    "FORMAL": (
        "Professional and respectful. No contractions. "
        "Open with 'Dear Hiring Team' and close with 'Sincerely'."
    ),
    "CONVERSATIONAL": (
        "Warm and direct, like a confident email to a future colleague. "
        "Contractions are fine. Keep it human, not chatty."
    ),
    "CONCISE": (
        "Maximum 120 words. Three short paragraphs: who I am, why I fit, "
        "call to action. Every sentence must earn its place."
    ),
}

_COVER_LETTER_PROMPT = """Write a cover letter for this candidate applying to this job.

Tone: {tone_instructions}

Hard rules:
- Ground every claim in the resume below. NEVER invent experience,
  employers, or skills the resume doesn't show.
- Mention the company by name and reference what the role actually needs.
- 150-250 words unless the tone says otherwise.
- Output ONLY the letter text — no subject line, no commentary, no
  markdown formatting.

Job:
{job}

Candidate resume (structured):
{resume}
{fit_context}
"""


# The human-in-the-loop design lives one layer up from here: this
# endpoint returns a DRAFT, NestJS stores it with coverLetterApproved:
# false, and only the user's explicit Approve click flips that flag.
# The AI service itself stays stateless — it doesn't know or care
# whether a draft was approved.
@router.post("/generate-cover-letter", response_model=GenerateCoverLetterResponse)
async def generate_cover_letter(
    payload: GenerateCoverLetterRequest,
) -> GenerateCoverLetterResponse:
    # temperature=0.7 — the opposite call from /analyze-fit's 0: this is
    # prose the user will edit and send under their own name, so slightly
    # varied, natural-sounding drafts are a feature (Regenerate should
    # produce a genuinely different letter, not the same one again).
    model = get_chat_model(temperature=0.7)

    # If NestJS already has a fit analysis for this pair, pass it through
    # so the letter can lean on the strongest matched skills — but the
    # endpoint stays fully functional without it (stateless service:
    # every input is optional context, not a dependency on prior calls).
    fit_context = (
        "\nKnown fit analysis (lean on the matched skills):\n"
        + json.dumps(payload.fit_analysis, indent=2)
        if payload.fit_analysis
        else ""
    )

    # No with_structured_output here: the output IS one plain text field,
    # so JSON wrapping adds a failure mode (small models sometimes mangle
    # long strings inside JSON) without buying any structure.
    result = await model.ainvoke(
        _COVER_LETTER_PROMPT.format(
            tone_instructions=_TONE_INSTRUCTIONS[payload.tone],
            job=json.dumps(payload.parsed_job, indent=2),
            resume=json.dumps(payload.parsed_resume, indent=2),
            fit_context=fit_context,
        )
    )

    return GenerateCoverLetterResponse(cover_letter=str(result.content).strip())
