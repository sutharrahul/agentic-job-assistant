from fastapi import FastAPI

from app.routers import (
    cover_letter,
    fit,
    interview_prep,
    job_description,
    resume,
)

app = FastAPI(title="Job Assistant AI Service")

# Each router lives in its own file under app/routers/ (one per endpoint) so
# this file stays pure wiring — no route logic here, just "which routes
# exist." When you add real parsing/scoring logic, it goes in the router
# files below, not here.
app.include_router(resume.router)
app.include_router(job_description.router)
app.include_router(fit.router)
app.include_router(cover_letter.router)
app.include_router(interview_prep.router)


@app.get("/health")
def health():
    return {"status": "ok"}
