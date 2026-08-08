# WALKTHROUGH

A guide to ApplyGraph's architecture — written so you can explain your own
codebase in an interview without having to re-derive *why* it's built this way.

> **Read this for the *reasoning*, not the status.** This document explains
> why the system is shaped the way it is — that part still holds. Its ✅ / 🚧
> progress markers are historical and no longer accurate: the resume upload,
> Kanban board, and auth UI it describes as unbuilt have since been built,
> and the empty LangGraph stub it describes has been deleted rather than
> finished.
>
> **[README.md](../README.md) is authoritative for what currently exists.**

---

## 1. Overall architecture — why each service exists

```
Browser
  │
  ▼
Next.js (frontend/)          — renders pages, never talks to FastAPI directly
  │  every request goes through src/lib/axios.ts
  ▼
NestJS (backend/)            — the only service with a database connection
  │  auth check → CRUD → (sometimes) call the AI service
  ▼
FastAPI (ai-service/)        — stateless: no DB, no user accounts, just AI work
  │
  ▼
Gemini API (via LangChain/LangGraph)

Supporting services (both reachable from NestJS or FastAPI, not from the browser):
  Supabase Postgres  — the actual database (via Prisma, from NestJS)
  Supabase Storage   — where uploaded resume files live
  Supabase Auth      — issues the JWT every request carries
  Redis (Upstash)    — cache + rate limiting
```

**Why three services instead of one?** Each one has a genuinely different
job and a different *failure mode*:

- **Next.js** — the only thing that runs in the user's browser. Its whole
  job is UI. It should never hold a database credential or a Gemini API
  key, because anything shipped to the browser is visible to the user.
- **NestJS** — the "trusted" backend. It's the only service allowed to talk
  to Postgres, and the only one that verifies *who* is making a request. It
  owns all business rules ("can this user see this application?").
- **FastAPI** — deliberately **stateless**: no database access, no idea
  what a "user" is. It receives data, calls Gemini, returns data. That
  narrow job is exactly what Python's AI ecosystem (LangChain, LangGraph)
  is built for, so it's a separate service in Python rather than trying to
  do LLM orchestration from Node.

**Why not let Next.js call FastAPI directly**, skipping NestJS? Because then
either (a) FastAPI would need to verify auth tokens and enforce "which
resumes can this user see" itself — duplicating logic that already lives
in NestJS — or (b) there'd be no auth check on AI calls at all. Routing
everything through NestJS means there's exactly one place auth is checked
and exactly one place that decides "is this request allowed."

---

## 2. One request, end to end: resume upload → fit score → cover letter → Kanban

This traces the flow the app is *designed* for. Each step names the real
file it lives in, and says ✅ (exists) or 🚧 (stubbed / TODO) so you know
what's actually running right now vs. what's planned.

1. **User logs in** (🚧 UI not built) — Supabase Auth issues a JWT, stored
   in the browser by the Supabase client SDK
   (`frontend/src/lib/supabase/client.ts`).

2. **User uploads a resume** (🚧 UI + logic not built) — the browser sends
   the file via `api.post('/resumes', ...)` using the shared axios
   instance (`frontend/src/lib/axios.ts` ✅), whose interceptor attaches
   `Authorization: Bearer <jwt>` automatically.

3. **NestJS receives `POST /resumes`** — `ResumesController.upload()`
   (`backend/src/resumes/resumes.controller.ts` ✅ routing, 🚧 body) is
   guarded by `SupabaseAuthGuard`, which verifies the JWT's signature
   against `SUPABASE_JWT_SECRET` and attaches the decoded user to the
   request (`backend/src/auth/guards/supabase-auth.guard.ts` ✅).

4. **NestJS stores the raw file** (🚧) — uploads it to Supabase Storage,
   gets back a path/URL.

5. **NestJS asks FastAPI to parse it** (🚧, but the plumbing is ✅) — via
   `OrchestrationService.parseResume()`
   (`backend/src/orchestration/orchestration.service.ts` ✅), which POSTs
   to FastAPI's `/parse-resume` (`ai-service/app/routers/resume.py` ✅
   route, 🚧 body). FastAPI fetches the file, extracts text, and (once
   built) runs LangGraph's `parse_resume` node to pull out structured
   data (skills, experience).

6. **NestJS saves the parsed resume** (🚧) via `PrismaService`
   (`backend/src/prisma/prisma.service.ts` ✅) into the `Resume` table
   (`backend/prisma/schema.prisma` ✅).

7. **User pastes a job description and requests a fit score** (🚧 UI) —
   `POST /applications`, handled by `ApplicationsController.create()`
   (`backend/src/applications/applications.controller.ts` ✅ routing, 🚧
   body).

8. **NestJS checks Redis first** (🚧 — not built yet, but this is *where*
   it belongs): before calling FastAPI's `/analyze-fit`, `Orchestration
   Service.analyzeFit()` should check whether this exact resume+job pair
   was scored before. If yes, return the cached score — skip the Gemini
   call entirely. If no, call FastAPI, then write the result to Redis.

9. **FastAPI scores the fit** (🚧) — `/analyze-fit`
   (`ai-service/app/routers/fit.py` ✅ route) runs the `analyze_fit`
   LangGraph node: compares `parsed_resume` against `parsed_job` and
   returns a `fit_score` + `skill_gaps`.

10. **NestJS generates a cover letter draft** (🚧) — calls FastAPI's
    `/generate-cover-letter` (`ai-service/app/routers/cover_letter.py` ✅
    route). This is the one step that **pauses for a human** instead of
    returning a finished answer — see §3 and §4 for why.

11. **User reviews and approves/edits the draft** (🚧 UI) — only after
    explicit approval does the cover letter get saved as final.

12. **NestJS saves the `Application` row** (🚧) with `status: APPLIED`,
    the fit score, skill gaps, and approved cover letter, via
    `ApplicationsService` (`backend/src/applications/applications.service.ts` ✅
    skeleton).

13. **User drags the card on the Kanban board** (🚧 UI) — calls
    `PATCH /applications/:id/status`
    (`ApplicationsController.updateStatus()` ✅), which updates the
    `status` enum field directly (`APPLIED → INTERVIEW → OFFER/REJECTED`).

---

## 3. The LangGraph pipeline, node by node

Files: `ai-service/app/graph/state.py`, `ai-service/app/graph/build.py`
(both ✅ exist as scaffolding; the nodes themselves are 🚧).

Think of LangGraph as a flowchart where each box is a plain Python
function, and one shared object (`JobAssistantState`, a dict) gets passed
from box to box, with each box adding a few more fields to it.

```
resume_text ──► [parse_resume] ──► parsed_resume ─┐
                                                    ├──► [analyze_fit] ──► fit_score, skill_gaps ─┐
job_description ──► [parse_job] ──► parsed_job ────┘                                             │
                                                                                                    ▼
                                                                          [generate_cover_letter] ──► cover_letter (DRAFT)
                                                                                     │
                                                                          ⏸ interrupt: wait for human approval
                                                                                     │
                                                                                     ▼
                                                                              cover_letter (FINAL)
```

- **`parse_resume`** — takes the raw resume text, asks Gemini to pull out
  structured data (skills, years of experience, past roles). Fills in
  `parsed_resume`.
- **`parse_job`** — same idea for the job description: extracts a title
  and a list of required skills. Fills in `parsed_job`.
- **`analyze_fit`** — takes both parsed structures (no LLM call
  necessarily required here — could be a straightforward skill-overlap
  calculation, or Gemini-assisted). Fills in `fit_score` and
  `skill_gaps`.
- **`generate_cover_letter`** — the only node that produces
  user-facing prose. Takes everything gathered so far and asks Gemini to
  draft a tailored cover letter. Fills in `cover_letter`.
- **The interrupt** — LangGraph supports pausing a running graph mid-way
  and resuming it later (possibly with human-edited input). We use this
  between "draft written" and "cover letter considered final" — see §4
  for the reasoning.

`build_graph()` currently returns an empty `StateGraph` — no nodes added,
no edges wired, not compiled. Building it out means: write each node as a
function `(state: JobAssistantState) -> dict`, call
`graph.add_node("parse_resume", parse_resume_fn)` for each, wire order
with `graph.add_edge(...)`, then `graph.compile()` to get something
runnable.

---

## 4. Anticipated interview questions

**"Why two backends instead of one?"**
Because they have fundamentally different jobs and trust levels. NestJS
owns authentication, authorization, and the database — it's the
"backend of record." FastAPI is a stateless AI worker with no idea what
a user or a database row is; it just transforms input into output via
Gemini. Splitting them means the AI service can be scaled, redeployed, or
even swapped for a different LLM stack without touching auth or data
logic, and a bug in prompt engineering can't accidentally leak a SQL
credential.

**"Why not just call FastAPI from Next.js directly?"**
Then FastAPI would need to authenticate users itself, and there'd be two
places enforcing "who can access what" instead of one. Centralizing that
in NestJS means one guard (`SupabaseAuthGuard`), one place to check.

**"Why Redis, and why cache specifically the fit score?"**
Fit-score and cover-letter generation both cost a real Gemini API call —
money and latency. Fit score is the one that's naturally
**idempotent**: the same resume against the same job description should
always produce the same score, so if a user refreshes the page or goes
back to re-check an application, it's wasteful to recompute it. Redis
also backs rate limiting — protecting the API from being hammered (by a
bug or by abuse) with a shared, fast counter that survives across NestJS
instances (an in-memory counter wouldn't, if you ever run more than one
backend process).

**"Why human-in-the-loop for the cover letter specifically, and not the
other AI steps?"**
A wrong fit score just means a slightly-off number the user can visually
judge. A wrong or badly-written cover letter goes out to a real employer
under the user's name — the cost of a bad AI output is much higher and
much more embarrassing. So that's the one step LangGraph pauses on
(`interrupt`) rather than returning a "final" answer straight from the
model.

**"How does NestJS verify a Supabase JWT without calling Supabase?"**
Supabase signs every JWT with a secret (`SUPABASE_JWT_SECRET`) known to
both Supabase and our backend. `jwt.verify(token, secret)` checks that
signature locally, using the `jsonwebtoken` library — no network call,
so it doesn't add latency and doesn't fail if Supabase's API happens to
be down.

**"Why does `User.id` in Prisma have no default?"**
Because it isn't generated by our database — it's set to match the UUID
Supabase Auth already assigned that user (the JWT's `sub` claim). If
Prisma generated its own random id, there'd be no way to connect "the
user this JWT belongs to" back to a row in our own `User` table.

**"Why is `OrchestrationService` the only thing that calls FastAPI?"**
So there's one place to add caching, retries, or error handling for AI
calls, instead of every feature module (Resumes, Applications) making
its own HTTP calls with its own copy of that logic.

---

## 5. Weak spots — study these before an interview

Specific lines where "why did you do it this way?" is a fair question,
and the honest answer is "trade-off" or "not finished yet," not "best
practice":

- ~~**`updateStatus()` casts the status string with no validation.**~~
  *Fixed* — `update-application.dto.ts` validates against the enum with
  `class-validator` before it reaches Prisma.

- ~~**No file-type/size validation for resume uploads.**~~ *Fixed* —
  `resumes.controller.ts` enforces a 5MB cap and PDF/DOCX only, by magic
  number rather than the client-supplied mimetype, and the browser now
  checks the size up front too.

- ~~**The LangGraph pipeline doesn't exist** — `build_graph()` returns an
  empty, uncompiled graph.~~ *Resolved by deletion, not completion.* The
  empty stub was removed. The one real LangGraph in the codebase is
  `ai-service/app/graph/interview_prep.py` — a compiled two-node graph
  (`derive_focus_areas → generate_questions`). If asked to walk through
  "the LangGraph code," that is the honest thing to walk through, and the
  cover-letter approval flow is a deliberate simplification (see below).

- **Cover-letter approval is a database boolean, not a LangGraph
  `interrupt`.** A durable interrupt needs checkpointer-backed state so a
  paused graph can be resumed across processes. The boolean gives the
  same user-facing guarantee at this scope. Know the difference — it's a
  likely follow-up question.

- **`backend/src/auth/guards/` — the `catch` block**
  treats "signature invalid," "token expired," and "wrong secret
  configured" identically (generic 401). Good for not leaking info to an
  attacker, bad for debugging your own misconfiguration — if
  `SUPABASE_JWT_SECRET` is wrong in `.env`, every request just says
  "Invalid or expired token" with no hint why.

- **`frontend/src/lib/axios.ts`** — the shared `api` instance reads the
  session via the *browser* Supabase client, so it only works correctly
  from Client Components. Using it inside a Server Component wouldn't
  throw, but it would silently send no auth token.

- **No rate limiting and no caching.** Nothing stops a user (or a bug in
  the frontend) from spamming `/analyze-fit` and burning Gemini quota,
  and scoring the same resume against the same job re-runs the model
  every time. Redis was the planned answer to both; it is not wired up,
  and the misleading `REDIS_URL` env var and landing-page logo have been
  removed rather than left implying otherwise.

- **`prisma.module.ts` uses `@Global()`** — convenient (no need to import
  `PrismaModule` everywhere), but it means `PrismaService` availability
  isn't visible just from reading a feature module's imports. Fine at
  this size; worth knowing it's a trade-off, not a free lunch.

- **The LangGraph pipeline doesn't exist yet** — `build_graph()` returns
  an empty, uncompiled graph. If asked to "walk through the LangGraph
  code," be upfront that the state shape and pipeline design are done,
  but the nodes themselves are unwritten — that's a much more defensible
  answer than pretending otherwise.
