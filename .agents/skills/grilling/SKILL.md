---
name: grilling
description: "Stress-test a plan, decision, or idea through questions. Use when the user asks to be grilled or another skill needs to resolve design decisions."
---

# Grilling

Reach a shared understanding before acting. Treat the design as a tree: a decision can unlock further decisions.

1. Read the relevant code, tests, and existing spec. Separate facts you can inspect from decisions only the user can make. Investigate facts yourself; use a focused subagent when useful, without delegating the user's decisions.
2. Find the open questions whose prerequisites are already settled. Ask those independent questions together in a numbered round, with your recommended answer and the important trade-off for each. Questions depending on unanswered questions belong in a later round.
3. Wait for the answers. Recompute the open questions; carry settled decisions forward instead of asking them again. If exploration is still needed, resolve it before asking dependent questions.
4. When no material decisions remain open, summarize the agreed scope, non-goals, behavior, testing approach, and trade-offs. Explicitly identify any remaining assumptions. Ask the user to confirm that understanding before implementation or publishing a plan.

Use this format for each round:

```text
❓ Q1 — Question title: question and relevant alternatives.
➡️ Recommended answer and why.

---

❓ Q2 — Question title: another independent question.
➡️ Recommended answer and why.
```

Match the depth of questioning to the change. A small fix does not require a product-design exercise. Explore material risks, not every imaginable extension. If the user pauses or stops the interview, summarize unresolved questions and stop.

Grilling alone does not authorize file changes. Once the understanding is confirmed, offer `to-spec` for durable planning or the smaller TDD path. Use existing project names and plain language; no glossary or domain-document setup is required.
