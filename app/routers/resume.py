from fastapi import APIRouter

from app.schemas.resume import ParseResumeRequest, ParseResumeResponse

router = APIRouter(tags=["resume"])


# `response_model=ParseResumeResponse` tells FastAPI to validate whatever
# this function returns against that schema (and to generate the OpenAPI
# docs from it) — so NestJS always gets a response shaped exactly like
# ParseResumeResponse, even if a future version of this function's body
# builds the data a different way.
@router.post("/parse-resume", response_model=ParseResumeResponse)
async def parse_resume(payload: ParseResumeRequest) -> ParseResumeResponse:
    # TODO: fetch the file from payload.resume_url, extract text, and run
    # it through the LangGraph resume-parsing node.
    return ParseResumeResponse()
