---
name: domain-modeling
description: Build and sharpen a project's domain model through precise terminology, concrete scenarios and evidence; save terms and ADRs using the shared spec-dev document conventions.
---

# Domain Modeling

Actively refine the domain model. Merely reading vocabulary is not a reason to start a separate modeling workflow.
Before any document action, read the current [shared document conventions](../../../requirement-analysis/references/document-conventions.md).
These conventions apply identically when DDD is called independently or by another workflow.

## During the session

- Challenge a conflict between the user's term and the applicable domain definition immediately; show both meanings and ask only when a real decision remains.
- Propose precise canonical terms for vague or overloaded language.
- Use concrete scenarios to examine domain boundaries; invented examples are hypothetical probes, never claims about current business behavior.
- Check the user's statement against relevant code when facts can be investigated; distinguish current behavior from proposed changes.
- Record candidates in the conversation until the design or the current document-saving scope is approved. Reuse an existing same-scope authorization.
- Save cross-feature terms in `.spec-dev/glossary.md` and feature-local terms in the corresponding spec. Different domain meanings retain their applicable domain.
- Record qualifying ADRs in `.spec-dev/adr/` with the shared numbering and lifecycle rules.
- Create files only when there is actual content and authorization. A resolved term alone does not authorize a write.
- Do not migrate, delete or maintain parallel copies of existing CONTEXT.md, docs/adr/ or another glossary automatically.
- If there is no relevant spec for a local term, retain the candidate or use the authorized handoff; do not invent a feature directory.
- A glossary contains domain definitions, not implementation details, scratch notes or runtime requirements.

## Formats

Use [term format](CONTEXT-FORMAT.md) and [ADR format](ADR-FORMAT.md) as examples, with the shared conventions as the normative source.
ADR eligibility remains the three-condition rule in that source; simple or obvious choices do not justify an ADR.
