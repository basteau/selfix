# Design It Twice

Use this when a consequential interface choice has multiple plausible answers, not for ordinary bug fixes. Consult [codebase-design](SKILL.md) and [DEEPENING.md](DEEPENING.md).

1. Frame the concrete problem for the user: existing callers, constraints, dependencies, compatibility obligations, and behavior to verify. A small illustrative example is useful; distinguish it from a selected design.
2. Compare two or three materially different designs. Use independent subagents when useful and available; otherwise compare them explicitly yourself. Give each the same constraints and evidence, but a different emphasis, such as the smallest interface versus the simplest common call site. Do not encourage speculative extensibility contrary to project scope.
3. For each design, show the interface or usage example, what complexity it hides, errors/invariants callers must understand, migration cost, testing approach, and limitations. Include the minimal-change option when credible.
4. Recommend a design based on concrete benefit, risk, and maintenance cost. Explain why the alternatives lose. A hybrid is useful only if it reduces trade-offs without combining all their complexity.
5. Ask for agreement before implementation. Hand an approved decision back to the calling skill; it can be captured by `to-spec`. The comparison itself does not authorize source edits.
