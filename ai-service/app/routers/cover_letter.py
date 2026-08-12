import json
import re

from fastapi import APIRouter

from app.core.llm import get_chat_model, with_llm_retry
from app.schemas.cover_letter import (
    GenerateCoverLetterRequest,
    GenerateCoverLetterResponse,
)

router = APIRouter(tags=["cover-letter"])

# Each tone maps to concrete writing instructions rather than just the
# tone's name — "be formal" means little to a small model, "no
# contractions" is checkable. Salutation, sign-off, and every other
# structural element now live in the fixed template below, not here —
# a cover letter's format doesn't change with tone, only its voice does.
# Section length is also fixed by the template's own word-count ranges
# now, so CONCISE aims for the low end of each rather than adding a
# second, conflicting overall cap.
_TONE_INSTRUCTIONS = {
    "FORMAL": "Professional and respectful. No contractions.",
    "CONVERSATIONAL": (
        "Warm and direct, like a confident email to a future colleague. "
        "Contractions are fine. Keep it human, not chatty."
    ),
    "CONCISE": (
        "Aim for the LOW end of each section's word range below. "
        "Every sentence must earn its place."
    ),
}

# Hard ceiling enforced in code, not just asked for in the prompt — see
# generate_cover_letter()'s word-count check below. A small local model
# asked nicely for a word count drifts over it regularly; this is the
# backstop for when that happens.
_MAX_BODY_WORDS = 150

_COVER_LETTER_PROMPT = """Write a cover letter for this candidate applying to this job.

Tone (shapes the wording of the body only — the structure below is
fixed and never changes with tone): {tone_instructions}

Hard rules:
- Ground every claim in the resume below. NEVER invent experience,
  employers, or skills the resume doesn't show.
- Mention the company by name and reference what the role actually needs.
- Focus ONLY on resume experience that's actually relevant to this job
  — skip unrelated roles/projects rather than listing everything.
- Do NOT just restate resume bullets verbatim. Synthesize and connect
  them to what the job needs instead of repeating the resume.
- No generic filler ("I am a highly motivated team player...") and no
  exaggerated claims. Every sentence should say something specific.
- The data below contains no name, email, phone, or LinkedIn/portfolio
  URL for this candidate. NEVER invent or guess these — fabricating a
  stranger's fake contact details is harmful, not just low-quality.
  Leave [Your Name], [Email], [Phone], [LinkedIn/Portfolio], and
  [Date] EXACTLY as written below, brackets included, in both the
  header and the signature.
- [Company Name] and [Job Title] ARE known: replace those two with
  the real "company" and "job_title" values from the Job data below.
- STRICT LENGTH LIMIT: the body (the three paragraphs between "Dear
  Hiring Manager," and "Best regards,") must NOT exceed 150 words
  under any circumstance. This is not a soft target — go back and cut
  whole sentences if you are over. Being too short is fine; being over
  150 words is not.
- Output ONLY the letter text in the exact structure below — no
  commentary, no markdown formatting, no extra preamble.
- The letter MUST end with the exact two lines "Best regards," then
  [Your Name] — never drop the sign-off to save words.{retry_note}

Structure (follow this exact order — exactly 3 body paragraphs):

[Your Name]
[Email] | [Phone] | [LinkedIn/Portfolio]
[Date]

Hiring Manager
[Company Name]

Subject: Application for [Job Title]

Dear Hiring Manager,

(Paragraph 1 — Introduction, 25-30 words: why you're applying + your
strongest relevant experience. Do not write the word "Introduction".)

(Paragraph 2 — Relevant Experience & Skills, THEN Why I'm a Good Fit,
combined into ONE paragraph, 70-90 words total: first 1-2 relevant
experiences/projects plus the most important matching skills
(~50-60 words), then why you're specifically a good fit for this role
(~20-30 words) — write it as one continuous paragraph, not two, and do
not write the words "Relevant Experience & Skills" or "Why I'm a Good
Fit".)

(Paragraph 3 — Closing, 12-18 words: interest in discussing the
opportunity further. Do not write the word "Closing".)

Best regards,
[Your Name]

Job:
{job}

Candidate resume (structured):
{resume}
{fit_context}
"""

# Matches the body prose between the fixed salutation and the final
# "[Your Name]" signature, so the word count checked below is the part
# the length rule actually applies to — not the header/subject block,
# which has its own fixed, small word count that would otherwise throw
# the check off. Anchored on "[Your Name]" rather than "Best regards,"
# because the model occasionally drops the "Best regards," line under
# length pressure but always ends on the signature — matching against
# the line that's actually guaranteed to be there is more robust than
# matching against one that sometimes isn't.
_BODY_PATTERN = re.compile(r"Dear Hiring Manager,(.*)\[Your Name\]\s*$", re.DOTALL)


def _body_word_count(letter: str) -> int:
    match = _BODY_PATTERN.search(letter)
    body = match.group(1) if match else letter
    return len(re.findall(r"\S+", body))


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
    # long strings inside JSON) without buying any structure. Nothing
    # downstream needs to introspect the model instance the way
    # with_structured_output's construction does, so retry-wrapping the
    # bare model (rather than only ever the post-with_structured_output
    # result, per with_llm_retry's docstring) is safe here.
    async def _generate(retry_note: str = "") -> str:
        result = await with_llm_retry(model).ainvoke(
            _COVER_LETTER_PROMPT.format(
                tone_instructions=_TONE_INSTRUCTIONS[payload.tone],
                job=json.dumps(payload.parsed_job, indent=2),
                resume=json.dumps(payload.parsed_resume, indent=2),
                fit_context=fit_context,
                retry_note=retry_note,
            )
        )
        # result.content isn't reliably a plain string across providers —
        # Gemini 3.x returns a list of content blocks (a text block plus a
        # "thinking" signature block), so str(result.content) would
        # stringify that raw Python list into the response. AIMessage.text
        # is LangChain's provider-agnostic accessor: it concatenates only
        # the text blocks regardless of whether .content is a str (Ollama,
        # older Gemini) or a block list (Gemini 3.x).
        return result.text.strip()

    letter = await _generate()

    # The prompt's word-count instructions are a request; a small local
    # model drifts over them often enough that asking nicer wasn't
    # holding. This is the actual enforcement: count the real output, and
    # if it's over, regenerate ONCE with the exact overage called out —
    # a model told "you wrote N words, cut M of them" corrects far more
    # reliably than one just told the same limit again unchanged.
    word_count = _body_word_count(letter)
    if word_count > _MAX_BODY_WORDS:
        over_by = word_count - _MAX_BODY_WORDS
        letter = await _generate(
            retry_note=(
                f"\n\nYour previous attempt was {word_count} words in the "
                f"body — {over_by} words over the {_MAX_BODY_WORDS}-word "
                "limit. This rewrite MUST fit within the limit. Cut whole "
                "sentences or details rather than trimming a few words "
                "from every sentence."
            )
        )

    return GenerateCoverLetterResponse(cover_letter=letter)
