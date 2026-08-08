import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.routers import (
    cover_letter,
    fit,
    interview_prep,
    resume,
)

app = FastAPI(title="Job Assistant AI Service")

# Each router lives in its own file under app/routers/ (one per endpoint) so
# this file stays pure wiring — no route logic here, just "which routes
# exist." When you add real parsing/scoring logic, it goes in the router
# files below, not here.
app.include_router(resume.router)
app.include_router(fit.router)
app.include_router(cover_letter.router)
app.include_router(interview_prep.router)


@app.get("/health")
def health():
    return {"status": "ok"}


logger = logging.getLogger(__name__)


# Without this, an exhausted LLM quota reached the user as a bare 500,
# which NestJS then reported as "The AI service is unavailable right
# now" — true, but it sends you debugging the wrong thing entirely.
#
# The provider's exception class is deliberately NOT imported here. Every
# SDK we might use exposes the upstream HTTP status as .code or
# .status_code, so duck-typing keeps core/llm.py as the only file in this
# service that knows which provider is in play.
#
# NestJS passes any 4xx straight through with its detail intact (see
# OrchestrationService.toHttpException), so 429 arrives at the browser
# with this message rather than being flattened to a 502.
@app.exception_handler(Exception)
async def handle_unexpected_error(_request: Request, exc: Exception):
    status = getattr(exc, "code", None) or getattr(exc, "status_code", None)

    if status == 429:
        logger.warning("Upstream LLM rate limit hit: %s", exc)
        return JSONResponse(
            status_code=429,
            content={
                "detail": (
                    "The AI provider's rate limit was reached. "
                    "Please wait a minute and try again."
                )
            },
        )

    # Anything else is a genuine bug. Log the real cause, and still
    # answer with JSON shaped like every other error this service
    # returns, so the caller never has to parse an HTML error page.
    logger.exception("Unhandled error in AI service")
    return JSONResponse(
        status_code=500,
        content={"detail": "The AI service failed to process this request."},
    )
