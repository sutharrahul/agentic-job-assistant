from urllib.parse import unquote, urlparse

from fastapi import APIRouter

from app.schemas.resume import ParseResumeRequest, ParseResumeResponse
from app.services.resume_extraction import extract_resume_data
from app.services.text_extraction import download_file, extract_text

router = APIRouter(tags=["resume"])


# `response_model=ParseResumeResponse` tells FastAPI to validate whatever
# this function returns against that schema (and to generate the OpenAPI
# docs from it) — so NestJS always gets a response shaped exactly like
# ParseResumeResponse, even if a future version of this function's body
# builds the data a different way.
@router.post("/parse-resume", response_model=ParseResumeResponse)
async def parse_resume(payload: ParseResumeRequest) -> ParseResumeResponse:
    # Three straight-line steps, each already isolated in its own module
    # so this function reads as "the pipeline," not "the implementation":
    # fetch the bytes, turn bytes into plain text, turn text into
    # structured data.
    file_bytes = await download_file(payload.resume_url)

    # Supabase signed URLs carry a query string (?token=...) after the
    # filename, and the filename itself is URL-encoded — strip both so
    # extract_text() sees a plain "resume.pdf", not
    # "resume%20final.pdf?token=abc123".
    filename = unquote(urlparse(payload.resume_url).path.split("/")[-1])

    resume_text = extract_text(file_bytes, filename)
    parsed = await extract_resume_data(resume_text)

    return ParseResumeResponse(parsed=parsed)
