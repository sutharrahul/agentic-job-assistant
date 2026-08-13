# The architecture assumes this service is unreachable from the internet:
# only NestJS ever calls it, so it has no auth, no CORS and no rate limit
# of its own. That assumption holds on any host with a private network —
# but NOT on a free tier. Render's free plan offers Web Services only, so
# the AI service gets a public URL whether you want one or not, and every
# endpoint behind it spends LLM quota on an API key we pay for.
#
# A shared secret is the cheapest thing that restores the assumption: the
# only legitimate caller is one service we also control, so there's no
# user identity to model here and nothing that a full auth scheme would
# buy. NestJS sends the header; anything else gets a 401.
import logging
import secrets

from fastapi import Header, HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)


def warn_if_unprotected() -> None:
    """Called once at startup so a missing token is visible in the logs.

    Left optional rather than required because local development runs this
    service on localhost, where the original "not reachable from outside"
    assumption is actually true and a mandatory token would be pure
    friction. Deployments get the value from render.yaml, so the only way
    to reach production unprotected is to deploy some other way — which is
    exactly when a startup line saying so is worth having.
    """
    if not settings.service_token:
        logger.warning(
            "SERVICE_TOKEN is not set - every endpoint is open to anyone who "
            "can reach this URL. Fine on localhost, not fine on a public host."
        )


async def require_service_token(
    x_service_token: str | None = Header(default=None),
) -> None:
    if not settings.service_token:
        return

    # compare_digest rather than == so the comparison takes the same time
    # whatever the input: a plain == returns early on the first wrong byte,
    # which leaks the correct prefix to anyone willing to time the replies.
    #
    # Compared as BYTES, not str. compare_digest raises TypeError on a str
    # containing non-ASCII, and uvicorn decodes header values as latin-1,
    # so any byte >= 0x80 in the header produces one. Unhandled, that
    # TypeError became a 500 with a logged stack trace instead of a 401 —
    # not a bypass, but it let an unauthenticated caller fill the log
    # quota with tracebacks. encode() makes every input comparable.
    if not x_service_token or not secrets.compare_digest(
        x_service_token.encode("utf-8"), settings.service_token.encode("utf-8")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing service token.",
        )
