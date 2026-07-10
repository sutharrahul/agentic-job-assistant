from io import BytesIO

import httpx
from docx import Document
from fastapi import HTTPException
from pypdf import PdfReader


async def download_file(url: str) -> bytes:
    # NestJS never sends us the raw file bytes over the wire — it sends a
    # short-lived Supabase Storage signed URL, and we fetch it ourselves.
    # That keeps this service's request payloads small and lets NestJS
    # stay the only service that knows how Storage is configured.
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=30.0)
        if response.status_code != 200:
            raise HTTPException(
                status_code=422,
                detail=f"Could not download resume from storage (status {response.status_code})",
            )
        return response.content


def extract_text_from_pdf(content: bytes) -> str:
    reader = PdfReader(BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def extract_text_from_docx(content: bytes) -> str:
    document = Document(BytesIO(content))
    return "\n".join(paragraph.text for paragraph in document.paragraphs)


def extract_text(content: bytes, filename: str) -> str:
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        text = extract_text_from_pdf(content)
    elif lower_name.endswith(".docx"):
        text = extract_text_from_docx(content)
    else:
        raise HTTPException(
            status_code=422,
            detail="Unsupported resume file type — only .pdf and .docx are supported",
        )

    if not text.strip():
        # A PDF made of scanned images (no embedded text layer) extracts
        # to an empty string here — pypdf can't OCR. We fail loudly
        # instead of silently sending an empty prompt to Gemini, which
        # would otherwise just hallucinate a resume from nothing.
        raise HTTPException(
            status_code=422,
            detail="No extractable text found in resume — is it a scanned image?",
        )
    return text
