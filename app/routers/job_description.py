from fastapi import APIRouter

from app.schemas.job_description import (
    ParseJobDescriptionRequest,
    ParseJobDescriptionResponse,
)

router = APIRouter(tags=["job-description"])


# Same response_model pattern as parse-resume — see resume.py for why.
@router.post("/parse-jd", response_model=ParseJobDescriptionResponse)
async def parse_job_description(
    payload: ParseJobDescriptionRequest,
) -> ParseJobDescriptionResponse:
    # TODO: run payload.job_description through the LangGraph
    # job-description-parsing node.
    return ParseJobDescriptionResponse()
