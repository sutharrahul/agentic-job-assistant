from fastapi import APIRouter

from app.schemas.cover_letter import (
    GenerateCoverLetterRequest,
    GenerateCoverLetterResponse,
)

router = APIRouter(tags=["cover-letter"])


@router.post("/generate-cover-letter", response_model=GenerateCoverLetterResponse)
async def generate_cover_letter(
    payload: GenerateCoverLetterRequest,
) -> GenerateCoverLetterResponse:
    # TODO: run the LangGraph cover-letter-generation node. Unlike the
    # other three endpoints, this one's output goes in front of a human
    # before it's considered "done" — a bad fit score just means a wasted
    # API call, but a bad cover letter gets sent to a real employer under
    # the user's name. So the graph should pause after drafting (a
    # LangGraph "interrupt") and this endpoint returns the draft for
    # review rather than a final answer; a separate approval step
    # resumes the graph. See WALKTHROUGH.md for the full flow.
    return GenerateCoverLetterResponse()
