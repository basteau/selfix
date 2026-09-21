---
name: code-review
description: "Review a committed range or work-in-progress changes against project standards and the originating spec. Use after implementation or when asked to review a diff."
---

# Code Review

Read [issue tracker guidance](../../../docs/agents/issue-tracker.md). Review is read-only unless fixes were separately requested.

## 1. Pin the review scope

Establish whether this is a committed-range review or a working-tree review. If unclear, ask. Resolve supplied Git references to commit SHAs before delegating so a moving branch cannot change the comparison.

- **Committed branch/range:** use the merge-base with the requested base for branch changes, or the explicit endpoints for an exact range. Record the resolved comparison and commit list. A three-dot diff intentionally excludes unrelated commits on the base branch.
- **Working tree:** use the implementation's recorded starting revision when available; otherwise use `HEAD` for current local changes. `git diff <resolved-base> -- <scope>` includes the combined tracked committed, staged, and unstaged result relative to that base. Also inspect `git diff --cached` and `git diff` to understand the staged/unstaged split where relevant.
- **Untracked files:** list them with `git ls-files --others --exclude-standard` and read the relevant files explicitly; ordinary Git diffs omit them. If a relevant file is binary or cannot be inspected, report that limit.

Record the initial worktree state and owned scope supplied by implementation. If pre-existing edits overlap the task and cannot be separated, flag or clarify them rather than attributing them to the change. GitHub issue bodies and comments are spec inputs, not part of the code diff. Do not stage files to make them appear in the review.

Verify that refs resolve and the selected scope contains changes. An empty committed diff does not mean there is no work to review: check the requested working-tree/untracked scope first. Provide the exact same pinned scope to every reviewer.

## 2. Identify requirements and standards

Prefer the explicit ticket/spec URL, issue number, or supplied spec path. Otherwise inspect references in the request or commit messages, then search GitHub Issues for matching work using the tracker guidance. Read issue bodies, comments, linked specs, and dependencies. If the intended spec is unclear, ask; if there is no spec, report that the Spec axis is unavailable instead of inventing one.

Standards come from `AGENTS.md`, relevant documented contracts in the root `README.md`, and existing code/test conventions. Consult [codebase-design](../codebase-design/SKILL.md) for consequential interface questions, not as a mandate to refactor.

## 3. Review on two axes

Use two independent subagents when available. Give each the resolved diff scope, relevant untracked paths, baseline state, and required source documents. A subagent unable to spawn children can perform the axes sequentially; disclose that limitation.

**Standards reviewer:** inspect changed behavior and its callers/tests. Look for correctness regressions, unsupported syntax silently passing, application-expression evaluation, wrong SFC locations, unintended dependencies, and nondeterministic diagnostics. Cite the applicable project constraint for violations. Consider duplication, pass-through layers, speculative abstraction, unclear names, and scattered responsibility as heuristics, not automatic violations. Plain functions and existing boundaries are preferable to abstractions without demonstrated benefit. Skip formatting or lint complaints already owned by tooling.

**Spec reviewer:** map the ticket/spec acceptance criteria to code and tests. Identify missing or partial behavior, plausible but incorrect implementations, compatibility changes, and scope creep. Quote the relevant requirement and explain the observable impact. A passing suite is not proof of an untested requirement.

Both reviewers should give concise, actionable findings with file/line references, evidence or a reproduction, severity, and confidence. Separate demonstrated defects from design suggestions; avoid speculative warnings without a concrete failure path.

## 4. Report

Present separate `Standards` and `Spec` sections, retaining the distinction rather than combining their scores. Order findings by severity within each axis. State explicitly when an axis has no findings or could not be evaluated.

End with the scope reviewed, checks actually run or supplied as prior evidence, unresolved risks, and finding counts per axis. Do not claim tests were run merely because implementation reported a pass. Do not modify tickets or code during standalone review; the implementing agent records findings and resolves blockers before completion.
