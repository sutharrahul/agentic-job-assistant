from fastapi import APIRouter

from app.schemas.fit import AnalyzeFitRequest, AnalyzeFitResponse

router = APIRouter(tags=["fit"])


# Note: this endpoint has no idea Redis exists. Caching lives one layer
# up, in NestJS's OrchestrationService — it checks Redis *before* deciding
# to call this endpoint at all. That keeps this service stateless (its one
# job) and keeps the caching decision next to the code that owns "should
# we even make this network call."
@router.post("/analyze-fit", response_model=AnalyzeFitResponse)
async def analyze_fit(payload: AnalyzeFitRequest) -> AnalyzeFitResponse:
    # TODO: run payload.parsed_resume / payload.parsed_job through the
    # LangGraph fit-scoring node.
    return AnalyzeFitResponse()
