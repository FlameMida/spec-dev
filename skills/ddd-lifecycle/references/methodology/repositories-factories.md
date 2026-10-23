# Repositories and Factories

## Repository Contracts

Define operations in the terms needed by the actual consumer. Follow the project's approved layering and [port ownership rules](../architecture/SKILL.md#port-ownership). A domain-consumed abstraction may belong in domain; a use-case dependency may belong in application. Do not relocate a working approved interface solely to match a generic directory template.

- A repository used for aggregate mutation must load the state needed to enforce that aggregate's invariants and persist it without leaking ORM/session types into domain behavior.
- Read-only projections may use a separate query contract and return DTOs; do not force aggregate reconstruction for every list/report query.
- Specify not-found, conflict, retry and persistence-error behavior. A fluent query builder or universal CRUD interface is not automatically a useful domain boundary.
- Reuse existing interfaces and project conventions. Add a new abstraction only for an actual consumer, replacement boundary or required policy.

## Persistence and Transactions

Choose collection-oriented change tracking or explicit save semantics from the real persistence mechanism. Make the write/flush point visible to callers; a `save()` name alone does not establish a commit boundary.

Transaction ownership belongs to the operation that coordinates the invariant. Repositories participating in one atomic use case must join its transaction rather than independently commit. Include rollback, concurrent conflict and operation-ID retry cases in integration validation. Keep related input values associated during canonicalization: sorting keys without applying the same permutation to their values corrupts the operation.

A test repository or in-memory fake proves only the behavior it implements. Validate database constraints, isolation, SQL mapping and multi-connection behavior with the real adapter.

## Factories

Use a constructor or creation method for simple creation; use a separate factory only when real assembly rules or dependencies justify it. Creation must either produce the valid initial state required by the current business contract or fail explicitly. Avoid partially initialized public objects that rely on callers to remember later validation.

Identity generation, defaults and creation events are part of the creation contract. Do not inject external side effects into construction merely for convenience; coordinate them through the applicable use case and failure policy.

## Reconstitution Is Not Creation

| Concern | New object | Loaded historical object |
|---|---|---|
| Identity | Generate/accept according to the creation contract | Retain stored identity |
| Events and external effects | Emit only the approved creation effects | Do not emit new-object events or repeat effects just by loading |
| Validation | Enforce current creation rules | Validate decoding/integrity and apply the approved historical-data policy |
| Rule evolution | New input follows the new rule | Do not assume stored data is valid, or silently apply new creation rules retroactively |

If historical data violates a new invariant, separate detection from the decision to reject, quarantine, repair or migrate it. Behavior-preserving refactoring keeps the existing read behavior until a change is approved. Do not hide invalid data by silently coercing fields.

## Specifications and Queries

A specification is useful when a domain predicate has real shared consumers or composition requirements. Keep a single query local when that is sufficient. If a predicate has both in-memory and database implementations, verify that nulls, boundaries, collation and combination operators have equivalent semantics; a shared interface alone does not prove equivalence.
