from fastapi import APIRouter

from app.graph.interview_prep import interview_prep_graph
from app.schemas.interview_prep import InterviewPrepRequest, InterviewPrepResponse

router = APIRouter(tags=["interview-prep"])


@router.post("/interview-prep", response_model=InterviewPrepResponse)
async def interview_prep(payload: InterviewPrepRequest) -> InterviewPrepResponse:
    # Unlike the single-call endpoints (fit, cover letter), this one runs
    # a compiled LangGraph: ainvoke() fans out to derive_study_topics and
    # generate_resume_questions concurrently and returns once both have
    # merged their results into the shared state dict (see
    # graph/interview_prep.py for why it's a graph).
    final_state = await interview_prep_graph.ainvoke(
        {
            "parsed_resume": payload.parsed_resume,
            "parsed_job": payload.parsed_job,
            "fit_analysis": payload.fit_analysis,
        }
    )

    return InterviewPrepResponse(
        focus_areas=final_state.get("focus_areas", []),
        study_topics=final_state.get("study_topics", []),
        questions=final_state.get("questions", []),
    )
