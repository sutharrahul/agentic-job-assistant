from pydantic import BaseModel, Field


class AnalyzeFitRequest(BaseModel):
    parsed_resume: dict
    # Built by NestJS straight from the Application row:
    # { company, job_title, description }. NOT the output of /parse-jd —
    # sending the raw JD text here avoids a second AI round trip before
    # every fit call.
    parsed_job: dict


class AnalyzeFitResponse(BaseModel):
    # No defaults, deliberately. This model doubles as the
    # with_structured_output schema, and a field WITH a default is
    # optional in the generated JSON schema — under Ollama's
    # schema-constrained decoding, small models take that as permission
    # to omit the field entirely (observed with gemma3:4b: score came
    # back, every list was silently empty). Required fields force the
    # model to actually produce them.
    #
    # Field(ge=..., le=...) does double duty too: it validates the
    # response AND puts the 0-100 bounds into the schema the model is
    # constrained by, so the range is enforced at generation time.
    fit_score: float = Field(ge=0, le=100)
    matched_skills: list[str]
    missing_skills: list[str]
    suggestions: list[str]
