---
name: domain-driven-design
description: 'Model software around the business domain using bounded contexts, aggregates, and ubiquitous language. Use when the user mentions "domain modeling", "bounded context", "aggregate root", "ubiquitous language", "anti-corruption layer", "context mapping", "domain events", "strategic design", "the code doesnt match the business", or "how do we split this big system". Also trigger when breaking a monolith into services, defining service boundaries, or aligning code structure with business processes. Covers entities vs value objects, domain events, and context mapping strategies. For architecture layers, see clean-architecture. For complexity, see software-design-philosophy.'
license: MIT
metadata:
  author: wondelai
  version: "1.4.0"
---

# Domain-Driven Design Decisions

Start from the approved spec, the project's established architecture and concrete business scenarios. These references supply decision criteria, not authority to replace an accepted design or invent domain rules. Surface a real conflict with its sources before changing the affected boundary.

## Review Criteria

Review applicable business rules and observed failure paths. Report the mismatch, evidence and smallest useful change; do not assign a numerical score. Simple CRUD does not need rich entities, events, factories or extra interfaces to pass review.

## Decision Routes

| Decision | What to establish | Reference |
|---|---|---|
| Terms and meanings | Definition, context and conflicting usage; distinguish confirmed terms from hypotheses | [Ubiquitous language](ubiquitous-language.md) |
| Context boundaries | Model differences, ownership, upstream/downstream obligations and integration cost | [Bounded contexts](bounded-contexts.md) |
| Entity, value object, aggregate | Identity, lifecycle, business invariants and the required consistency window | [Building blocks](building-blocks.md) |
| Events and asynchronous work | Actual consumers, acceptable delay, publication failure and duplicate handling | [Domain events](domain-events.md) |
| Persistence and creation | Consumer-owned interfaces, transaction ownership, creation versus reconstitution | [Repositories and factories](repositories-factories.md) |
| Modeling investment | Business differentiation, rule complexity and replacement cost | [Strategic design](strategic-design.md) |
| Dependency placement | Approved layer/package boundaries and the actual consumer of a port | [Architecture](../architecture/SKILL.md) |

Read the relevant route when making that decision. Do not load every tutorial or add every listed pattern to each task.

## Decisions That Must Be Explicit

- Identify the state that must change together, the invariant protected and what a caller observes after failure. An object having its own ID does not establish an independent transaction boundary.
- When existing aggregate boundaries conflict with required atomicity, revisit the boundaries and transaction design. Do not silently weaken the requirement to eventual consistency.
- Keep pure domain rules free of infrastructure types. Interface ownership follows the actual consumer and approved architecture; repositories are not universally required to live in a package named `domain`.
- A test double can demonstrate local behavior but cannot prove storage constraints, transaction isolation or delivery guarantees. Name the real integration evidence needed for those claims.
- Existing data and public behavior constrain refactoring. A stricter new constructor must not silently reject historical records or replay creation side effects during loading.

## Review Output

For each applicable issue, provide the violated rule or scenario, current implementation evidence, impact and proposed boundary/change. State unanswered domain questions separately. Reuse approved terminology and ADR decisions; document locations and authorization follow the parent skill's shared conventions.
