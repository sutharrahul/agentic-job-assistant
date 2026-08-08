from langgraph.graph import StateGraph

from app.graph.state import JobAssistantState


def build_graph() -> StateGraph:
    # A LangGraph pipeline is built in two steps: (1) construct a graph of
    # nodes + edges (this function), (2) call .compile() on it to get a
    # runnable object. We keep step 1 in its own function so the graph's
    # *shape* (which nodes exist, in what order) is defined in one place,
    # separately from wherever it actually gets invoked/compiled.
    graph = StateGraph(JobAssistantState)

    # TODO: each node below is a plain function that takes the state dict,
    # does its own piece of work, and returns the fields it filled in —
    # LangGraph merges those back into the shared state (see state.py):
    #   - parse_resume:        resume_text        -> parsed_resume
    #   - parse_job:            job_description     -> parsed_job
    #   - analyze_fit:          parsed_resume + parsed_job -> fit_score, skill_gaps
    #   - generate_cover_letter: all of the above -> cover_letter
    # Wire them with graph.add_edge("parse_resume", "analyze_fit"), etc.
    #
    # generate_cover_letter should pause for human approval before the
    # cover letter is considered final (LangGraph calls this an
    # "interrupt") — see WALKTHROUGH.md for why that step exists.
    return graph
