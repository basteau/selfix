---
name: improve-codebase-architecture
description: "Find evidence-backed architectural simplifications, compare candidates, and explore the one the user chooses."
disable-model-invocation: true
---

# Improve Codebase Architecture

Load [codebase-design](../codebase-design/SKILL.md). Read linked skill files directly if no native skill tool is available.

## 1. Scope and investigate

If the user named a problem or area, start there. Otherwise inspect recent Git history for areas that repeatedly change, then examine their callers and tests. Prioritize observed friction over theoretical cleanliness. Use focused subagents when independent areas warrant investigation, or inspect directly when the scope is small.

Look for:

- A single behavior scattered across several thin modules or repeated at callers.
- Interfaces exposing almost as much complexity as they hide.
- Coupling that makes ordinary changes require coordination across unrelated files.
- Tests that assert helper behavior while missing the real calling pattern.
- Layers or configuration added for hypothetical use cases.
- Boundaries that make important failures hard to reproduce or diagnose.

Apply the deletion test from `codebase-design`. Consider deletion, consolidation, an improved existing interface, or no change before proposing a new abstraction. Keep selfix's small workspace, plain functions, parser/compiler usage, and dependency constraints intact.

## 2. Present candidates, not an implementation

Default to a concise Markdown report in the conversation. For each worthwhile candidate give:

- **Evidence:** relevant paths/lines, callers, repeated changes, or a concrete failing example. Distinguish reproduced defects from hypotheses.
- **Problem:** what is currently costly, fragile, or hard to test.
- **Simplification:** a plain-language before/after description, without committing to a new interface yet.
- **Benefit:** what callers no longer need to know, where related behavior becomes local, and what tests improve.
- **Cost and risk:** migration, compatibility, coverage, and possible overengineering.
- **Why now:** why this earns attention over feature work or a targeted fix.
- **Confidence:** strong, worth exploring, or speculative.

A small text diagram may help. Generate a visual report only if requested; it is not a prerequisite and should not require installing packages or changing the application. Do not open a browser or fetch CDN scripts automatically.

Recommend the strongest candidate, or say no worthwhile architectural change was found. Do not manufacture a quota of findings. Ask which candidate the user wants to explore before designing or implementing it.

## 3. Explore the selected candidate

Load [grilling](../grilling/SKILL.md) to resolve constraints, trade-offs, compatibility, and testing. For a consequential interface choice, use the optional [Design It Twice](../codebase-design/DESIGN-IT-TWICE.md) reference rather than automatically launching multiple designs.

Once the user confirms the direction, offer [to-spec](../to-spec/SKILL.md) and then [to-tickets](../to-tickets/SKILL.md) to record the approved work using their shared tracker guidance. Do not create separate architecture trackers, glossaries, ADRs, or tickets on your own. Keep rejected alternatives and their reasons in the eventual spec when they affect future decisions.

This skill discovers and plans; it does not authorize code changes, commits, or pushes.
