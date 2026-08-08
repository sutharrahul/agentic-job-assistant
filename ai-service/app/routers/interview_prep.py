from fastapi import APIRouter

from app.graph.interview_prep import interview_prep_graph
from app.schemas.interview_prep import InterviewPrepRequest, InterviewPrepResponse

router = APIRouter(tags=["interview-prep"])


@router.post("/interview-prep", response_model=InterviewPrepResponse)
async def interview_prep(payload: InterviewPrepRequest) -> InterviewPrepResponse:
    # Unlike the single-call endpoints (fit, cover letter), this one runs
    # a compiled LangGraph: ainvoke() executes derive_focus_areas ->
    # generate_questions in order, threading one shared state dict
    # through both (see graph/interview_prep.py for why it's a graph).
    final_state = await interview_prep_graph.ainvoke(
        {
            "parsed_resume": payload.parsed_resume,
            "parsed_job": payload.parsed_job,
            "fit_analysis": payload.fit_analysis,
        }
    )

    return InterviewPrepResponse(
        focus_areas=final_state.get("focus_areas", []),
        technical_questions=final_state.get("technical_questions", []),
        behavioral_questions=final_state.get("behavioral_questions", []),
        gaps_to_prepare=final_state.get("gaps_to_prepare", []),
    )
