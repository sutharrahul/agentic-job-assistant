# WALKTHROUGH

A guide to the Agentic Job Assistant's architecture — written so you can
explain your own codebase in an interview without having to re-derive *why*
it's built this way.

> **Read this for the *reasoning*, not the status.** This document explains
> why the system is shaped the way it is — that part still holds. The ✅ / 🚧
> progress markers it used to carry have been removed: everything they marked
> as unbuilt (resume upload, Kanban board, auth UI) has since been built, so
> §2 now states status in prose. Every step it describes is running.
>
> Two things changed after most of this was written, and both are corrected
> in place below: **auth moved from Supabase Auth to Clerk**, and the
> four-node LangGraph pipeline this used to describe was never built — the
> real graph is the two-node interview-prep one in §3.
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
An LLM provider (via LangChain/LangGraph) — Ollama or Gemini,
                                            picked by the LLM_PROVIDER env var

Supporting services (reachable from NestJS, not from the browser):
  Supabase Postgres  — the actual database (via Prisma, from NestJS)
  Supabase Storage   — where uploaded resume files live
  Clerk              — issues the JWT every request carries
```

> There is no cache tier in this diagram, and that's deliberate. A Redis
> box sat here for a long time as "cache + rate limiting"; neither use
> survived contact with the design. Rate limiting turned out to work
> in-memory at this scale (`ThrottlerModule` in `app.module.ts`), and
> Postgres already does the caching job — see §4.

**Why three services instead of one?** Each one has a genuinely different
job and a different *failure mode*:

- **Next.js** — the only thing that runs in the user's browser. Its whole
  job is UI. It should never hold a database credential or an LLM
  provider API key, because anything shipped to the browser is visible
  to the user.
- **NestJS** — the "trusted" backend. It's the only service allowed to talk
  to Postgres, and the only one that verifies *who* is making a request. It
  owns all business rules ("can this user see this application?").
- **FastAPI** — deliberately **stateless**: no database access, no idea
  what a "user" is. It receives data, calls the LLM, returns data. That
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

This traces the flow end to end, and each step names the real file it
lives in. Everything below is built and running.

1. **User logs in** — Clerk issues a session JWT and manages it in the
   browser (`@clerk/nextjs`; the sign-in UI lives at
   `frontend/src/app/(auth)/login/`).

2. **User uploads a resume** — the browser sends the file via
   `api.post('/resumes', ...)` using the shared axios instance
   (`frontend/src/lib/axios.ts`), whose interceptor calls Clerk's
   `getToken()` and attaches `Authorization: Bearer <jwt>` automatically.

3. **NestJS receives `POST /resumes`** — `ResumesController.upload()`
   (`backend/src/resumes/resumes.controller.ts`) is guarded by
   `ClerkAuthGuard`, which verifies the JWT with `@clerk/backend`'s
   `verifyToken` and attaches the decoded payload to the request
   (`backend/src/auth/guards/clerk-auth.guard.ts`).

4. **NestJS stores the raw file** — uploads it to Supabase Storage under
   a `userId/`-prefixed path (`backend/src/supabase/supabase.service.ts`)
   and creates the `Resume` row with `status: PROCESSING` *before*
   parsing starts, so a failed parse leaves a `FAILED` record rather than
   the upload silently vanishing.

5. **NestJS asks FastAPI to parse it** — via
   `OrchestrationService.parseResume()`
   (`backend/src/orchestration/orchestration.service.ts`), which POSTs a
   short-lived signed URL to FastAPI's `/parse-resume`
   (`ai-service/app/routers/resume.py`). FastAPI downloads the file,
   extracts the text (`app/services/text_extraction.py`), and calls
   `extract_resume_data()` (`app/services/resume_extraction.py`) — a
   single `temperature=0` call with
   `with_structured_output(ParsedResumeData)`. **Not a LangGraph node.**
   Earlier drafts of this document promised a `parse_resume` node; that
   graph never existed and isn't planned — extraction is one step, so a
   graph would add ceremony and nothing else. See §3.

6. **NestJS saves the parsed resume** via `PrismaService`
   (`backend/src/prisma/prisma.service.ts`) into the `Resume` table
   (`backend/prisma/schema.prisma`), moving the row to `PARSED`. The user
   reviews and edits the extracted fields, and saving flips it to
   `CONFIRMED` — the status every AI action below requires, because
   parsed-but-unreviewed data may still contain extraction errors.

7. **User pastes a job description and creates an application** —
   `POST /applications`, handled by `ApplicationsController.create()`
   (`backend/src/applications/applications.controller.ts`), from the form
   at `frontend/src/app/(dashboard)/applications/new/`. Scoring the fit
   is a separate explicit action: `POST /applications/:id/analyze-fit`.

8. **FastAPI scores the fit** — `/analyze-fit`
   (`ai-service/app/routers/fit.py`) is a single `temperature=0` LLM call
   with `with_structured_output(AnalyzeFitResponse)`. Not a LangGraph
   node: it's one step, so a graph would add ceremony and nothing else.
   Returns `fit_score`, `matched_skills`, `missing_skills`, `suggestions`.

9. **NestJS generates a cover letter draft** — calls FastAPI's
    `/generate-cover-letter` (`ai-service/app/routers/cover_letter.py`),
    a single `temperature=0.7` call returning plain text. NestJS stores
    it with `coverLetterApproved: false` — this is the step that waits
    for a human, see §4 for why and for how that wait is implemented.

10. **User reviews and approves/edits the draft** — the draft is already
    persisted (step 9 wrote it) but stays unapproved until an explicit
    click. "Approve" sends the possibly-edited text *and*
    `coverLetterApproved: true` in one PATCH
    (`frontend/src/components/applications/cover-letter-card.tsx`).
    Be precise about the edit case, because it's easy to get backwards:
    typing in the textarea sends **no** request. The card keeps a local
    `hasLocalEdits` flag and renders
    `approved = app.coverLetterApproved && !hasLocalEdits`, so an edit
    invalidates the approval *in the UI* until the user approves again.
    The stored flag only goes back to `false` on **regeneration**, which
    `ApplicationsService.generateCoverLetter()` writes as part of the
    same update.

11. **The `Application` row carries every result** — it was created in
    step 7 with `status: APPLIED` (the schema default), and each AI
    action updates it in place: fit score + skill gaps, cover letter +
    tone + approval flag, interview prep. All of it goes through
    `ApplicationsService`
    (`backend/src/applications/applications.service.ts`).

12. **User drags the card on the Kanban board**
    (`frontend/src/components/applications/kanban-board.tsx`) — it moves
    the card optimistically, then calls
    `api.patch(`/applications/${id}`, { status })` via
    `updateApplication()` (`frontend/src/lib/api/applications.ts`) and
    reverts if the request fails. On the server that's `@Patch(':id')` →
    `ApplicationsController.update()`. **There is no dedicated status
    route:** one PATCH covers status, notes and the cover-letter fields,
    and `UpdateApplicationDto` decides what's allowed — every field is
    optional, the global `ValidationPipe` whitelist strips anything else,
    and `@IsEnum(ApplicationStatus)` turns an invalid status into a clean
    400 before it ever reaches Prisma
    (`APPLIED → INTERVIEW → OFFER/REJECTED`).

---

## 3. The LangGraph pipeline, node by node

File: `ai-service/app/graph/interview_prep.py`.

> **Correction.** Earlier drafts of this document described a four-node
> `parse_resume → parse_job → analyze_fit → generate_cover_letter` graph
> with a human-approval `interrupt` in the middle, built on
> `graph/state.py` and `graph/build.py`. **That graph was never built.**
> Those two files only ever contained an empty `StateGraph`, and they have
> since been deleted. Fit analysis and cover-letter generation are single
> LLM calls in their own routers, not graph nodes — a graph would have
> bought nothing, because neither has more than one step.
>
> Interview prep is the one feature with a genuine multi-step shape, so
> it's the one place LangGraph earns its keep. That is the graph below.

Think of LangGraph as a flowchart where each box is a plain Python
function, and one shared object (`InterviewPrepState`, a `TypedDict`) is
passed from box to box, each box adding the fields it computed.

```
parsed_resume ─┐
parsed_job     ├──► [derive_focus_areas] ──► focus_areas, gaps_to_prepare
fit_analysis? ─┘              │
                              ▼
                     [generate_questions] ──► technical_questions,
                                              behavioral_questions
```

- **`derive_focus_areas`** — reads the job, the resume, and (optionally)
  an earlier fit analysis, and picks the 3–5 themes the interview will
  most likely centre on, plus the gaps worth studying. Runs at
  `temperature=0`: it's an analysis step, so the same inputs should give
  the same answer.
- **`generate_questions`** — reads `focus_areas`, the field the first node
  just wrote, and writes technical and behavioural questions with talking
  points grounded in the candidate's actual projects. Runs at
  `temperature=0.4`, so "Regenerate" rewords rather than repeats.

**Why two nodes instead of one prompt**, which is the question to expect:

1. Small models handle "work out what matters, *then* write questions
   about it" far better as two focused calls than as one mega-prompt.
   This was developed against `gemma3:4b` locally, where the difference
   was obvious.
2. `focus_areas` is a visible intermediate artifact. When the questions
   come out generic, you can see whether node 1 picked bad themes or node
   2 wrote badly about good ones. One prompt gives you no such seam.
3. The handoff between the nodes *is* the state passing — which is the
   thing LangGraph is for. A single call wouldn't need a graph at all.

Each node returns only the fields it computed; LangGraph merges that into
the shared state before the next node runs. The graph is compiled once at
import (`interview_prep_graph`) — compilation wires it up without making
any LLM calls, and the compiled object is stateless, so it's safe to
share across requests since every `ainvoke` gets its own state dict.

**No checkpointer, and therefore no `interrupt`.** See §4.

---

## 4. Anticipated interview questions

**"Why two backends instead of one?"**
Because they have fundamentally different jobs and trust levels. NestJS
owns authentication, authorization, and the database — it's the
"backend of record." FastAPI is a stateless AI worker with no idea what
a user or a database row is; it just transforms input into output via
whichever LLM provider is configured (Ollama or Gemini — one env var,
`app/core/llm.py` is the only file that knows the difference).
Splitting them means the AI service can be scaled, redeployed, or
even swapped for a different LLM stack without touching auth or data
logic, and a bug in prompt engineering can't accidentally leak a SQL
credential.

**"Why not just call FastAPI from Next.js directly?"**
Then FastAPI would need to authenticate users itself, and there'd be two
places enforcing "who can access what" instead of one. Centralizing that
in NestJS means one guard (`ClerkAuthGuard`), one place to check.

**"Why is there no cache in front of the LLM calls?"**
The good version of this answer starts by narrowing the question, because
only one of these calls is even a cache candidate. Fit score is
**idempotent** — `temperature=0`, so the same resume against the same job
should always produce the same score. A cover letter is the opposite:
"Regenerate" is *supposed* to return a different draft, so caching it
would break the feature outright.

So the question is only ever about fit score, and there **Postgres is
already the cache**. `ApplicationsService.analyzeFit()` writes `fitScore`
and `skillGapAnalysis` onto the application row, and nothing recomputes
them — revisiting or refreshing an application reads the stored result.
The only path back to the model is the explicit "Re-run analysis" button,
which is a *request* for a fresh answer; serving that from a cache would
break it for the same reason caching "Regenerate" would.

That leaves one real gap, worth naming before an interviewer finds it:
the cache is per application, so pasting the same job description into
two applications scores it twice. A keyed cache would fix that. It would
also be a whole piece of infrastructure to save one LLM call in an
uncommon case — which is why an earlier Redis plan was dropped rather
than built.

**"Why human-in-the-loop for the cover letter specifically, and not the
other AI steps?"**
A wrong fit score is a slightly-off number the user can judge at a
glance. A badly-written cover letter goes to a real employer under the
user's name — the cost of a bad output is far higher. So it's the one
output that is never treated as final: FastAPI returns a *draft*, NestJS
stores it with `coverLetterApproved: false`, and only an explicit click
flips that flag. Editing the text afterwards invalidates the approval in
the UI — the card tracks the edit locally and stops showing "Approved"
until you approve again — and regenerating resets the stored flag to
`false` server-side.

Worth knowing the follow-up: **that approval is a database flag, not a
LangGraph `interrupt`.** A durable interrupt needs a checkpointer so a
paused graph survives a process restart — on a free tier that sleeps,
"paused in memory" means "lost". A boolean gives the identical
user-facing guarantee with none of that machinery, and the state has to
live in Postgres regardless, since it's shown on the application page.

**"How does NestJS verify a Clerk JWT?"**
`verifyToken` from `@clerk/backend` checks the token's RS256 signature
against Clerk's public JWKS. Clerk's SDK caches those keys, so the
common path is a local verification with no network round-trip.

One sharp edge worth mentioning: Clerk's default session token carries
**no email claim**. It has to be added in the dashboard under
Sessions → Customize session token, and without it every user provision
falls back to an extra Clerk API call — see `UsersService.resolveEmail()`.

**"Why does `User.id` in Prisma have no default?"**
Because it isn't generated by our database — it's set to the id Clerk
already assigned that user (the JWT's `sub` claim, e.g. `user_2abc…`).
If Prisma generated its own random id, there'd be no way to connect "the
user this JWT belongs to" back to a row in our own `User` table. It's a
`String` rather than a UUID column for the same reason: the value's
shape is Clerk's to decide, not ours.

**"Why is `OrchestrationService` the only thing that calls FastAPI?"**
So there's one place to add caching, retries, or error handling for AI
calls, instead of every feature module (Resumes, Applications) making
its own HTTP calls with its own copy of that logic.

---

## 5. Weak spots — study these before an interview

Specific lines where "why did you do it this way?" is a fair question,
and the honest answer is "trade-off" or "not finished yet," not "best
practice":

- ~~**The status PATCH casts the status string with no validation.**~~
  *Fixed* — `update-application.dto.ts` validates against the real Prisma
  enum with `class-validator` before it reaches Prisma. (Status changes
  go through the single `@Patch(':id')` → `update()` handler; there has
  never been a separate `updateStatus()` route.)

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

- **`clerk-auth.guard.ts` — the `catch` block** treats "signature
  invalid," "token expired," and "wrong secret configured" identically
  (generic 401). Good for not leaking information to an attacker, bad for
  debugging your own misconfiguration — if `CLERK_SECRET_KEY` is wrong in
  `.env`, every request just says "Invalid or expired token" with no hint
  why.

- **`frontend/src/lib/axios.ts`** — the shared `api` instance gets its
  token from Clerk's `getToken()`, which is browser-only, so it works
  only from Client Components. Using it inside a Server Component
  wouldn't throw; it would silently send no auth token.

- ~~**No rate limiting.**~~ *Fixed* — `@nestjs/throttler` now caps the
  quota-spending routes per authenticated user (`UserThrottlerGuard`
  overrides `getTracker` to key on the Clerk user id rather than IP,
  because behind a reverse proxy every request shares one address).
  Two windows, because a per-minute cap alone still allows thousands of
  calls a day: 10/min and 60/day on the AI actions, 5/min and 40/day on
  resume upload.

- **No cache across applications.** Within one application the score is
  stored and reused (see §4), but the same job description pasted into
  two applications is scored twice. Rate limiting does *not* cover this
  — it bounds abuse, not waste.

- **Throttle counters are in-memory.** They reset on restart and aren't
  shared across instances, so a multi-instance deployment would need a
  shared store to enforce limits accurately. Fine on a single free-tier
  instance; know that it's a deliberate scope choice.

- **`prisma.module.ts` uses `@Global()`** — convenient (no need to import
  `PrismaModule` everywhere), but it means `PrismaService` availability
  isn't visible just from reading a feature module's imports. Fine at
  this size; worth knowing it's a trade-off, not a free lunch.

- **The AI service is reachable from the internet.** The architecture
  assumes it isn't — that's what makes "no auth on FastAPI" a reasonable
  choice — but the free hosting tier has no private services, so it gets
  a public URL. A shared `X-Service-Token` check
  (`ai-service/app/core/security.py`) stands in for the network isolation
  the design assumed. Worth raising yourself: noticing that your
  deployment broke an architectural assumption is a better answer than
  being asked about it.
