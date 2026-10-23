---
name: hexagonal-architecture
description: Design, implement, and refactor Ports & Adapters systems with clear domain boundaries, dependency inversion, and testable use-case orchestration across TypeScript, Java, Kotlin, and Go services. Use when introducing or refactoring toward Ports and Adapters, or when domain logic has become entangled with I/O.
metadata:
  origin: ECC
---

# Hexagonal Architecture Boundaries

Use the project's approved architecture and existing module boundaries first. Hexagonal roles describe dependencies; they do not prescribe identical directories, classes or interfaces in every language. Add separation where an actual use case, invariant or replacement boundary needs it.

## Port Ownership

Place a port with its actual consumer, following the approved project convention. An application/use-case dependency normally belongs to application; an abstraction genuinely consumed by domain behavior may belong to domain. Resolve a conflicting existing contract before moving interfaces. The repository reference uses this same rule.

Dependencies point inward: adapters implement internal contracts; domain rules do not depend on HTTP, ORM, broker or SDK types. A pure library is not an infrastructure adapter merely because it is third-party. Keep external data/error translation at the appropriate adapter boundary.

## Implementation Workflow

1. Identify the observable use case, inputs, results, errors and business invariants.
2. Reuse or define the narrow dependency contracts actually consumed by that use case. Preserve approved test seams; do not invent extra interfaces just to make a diagram symmetrical.
3. Implement domain rules and use-case coordination, with explicit transaction ownership and failure behavior.
4. Implement inbound/outbound adapters and translate protocol, persistence and external-model details there.
5. Wire real dependencies in an explicit composition root; keep runtime resource ownership and shutdown visible.
6. Verify the behavior at the approved boundaries and through the required real integration path.

A repository must not independently commit when its writes belong to one use-case transaction. Before coordinating an external side effect and local persistence, describe failure between them, retry identity and recovery; a successful remote call followed by a local save is not an atomic operation.

## Testing Guidance

| Boundary | Evidence |
|---|---|
| Domain behavior | Invariants, state transitions and error cases through the public domain interface |
| Use case | Results and relevant port interactions using approved doubles where appropriate |
| Outbound adapter | Real storage/protocol mapping, constraints, transaction behavior and failure handling |
| Inbound adapter | Actual input/output/error translation at the protocol boundary |
| User flow | Required real composition of entry, authorization, state changes and visible outcome |

Fakes prove the local behavior they implement; they do not prove production storage or delivery semantics. Testing discipline and verification scope come from test-driven-development and test-strategy rather than a second architecture-specific test workflow.

## Migration Playbook

Choose an authorized vertical slice whose boundary causes a concrete maintenance problem. Capture existing public behavior, introduce or reuse the necessary boundary, move coordination and adapt existing callers, then verify the same behavior through the new route.

Keep a rollback path where the rollout requires one and define when the old path is removed. Do not turn incremental migration into indefinite compatibility layers, rewrite unrelated modules, or apply new creation rules to historical records without an approved behavior change.

## Review

Trace actual dependencies and resource lifetimes. Report framework/IO leakage, hidden composition, mismatched contracts or missing failure handling with concrete evidence. Do not reject a design for missing a prescribed folder tree, interface-per-class layout, repository layer or language-specific class pattern.
