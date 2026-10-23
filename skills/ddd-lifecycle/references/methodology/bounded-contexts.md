# Bounded Contexts and Context Mapping

A context bounds the meaning of a model. Start from actual language, rules, ownership and integration obligations. Team structure, tables, services and deployment units are evidence to consider, not automatic context boundaries. A context may remain a module in a monolith.

## Decide Whether to Split

Split when one model carries conflicting meanings or independently evolving rules that cannot be kept coherent. Consider merging when closely related concepts change together and translation creates more work than it removes. Preserve required consistency and public contracts when changing a boundary.

## Choose the Relationship

| Pattern | Suitable relationship | Constraint to make explicit |
|---|---|---|
| Partnership | Both parties must evolve together | Joint planning, release coordination and consequences when one party cannot deliver |
| Shared Kernel | A small shared model is cheaper than translation | Co-ownership, agreed changes and tests in every consumer; do not let the shared model grow by convenience |
| Customer-Supplier | Downstream depends on upstream and can negotiate | Upstream/downstream ownership, requested contracts and change process |
| Conformist | Accepting an upstream model is an intentional cost tradeoff | Which meanings/changes downstream accepts; do not pretend it owns the external model |
| Anti-Corruption Layer | External meanings must be translated to preserve the local model | Ownership of protocol adaptation and semantic translation; avoid redundant wrapper layers |
| Open Host Service | Upstream serves multiple consumers through a stable interface | Supported contract, versioning and error semantics |
| Published Language | Participants share an explicit exchange format | Schema ownership, meaning and evolution; often paired with Open Host Service |
| Separate Ways | Integration costs more than its business value | Accepted duplication and excluded integration obligations |
| Big Ball of Mud | Existing boundaries are tangled | Describe the current reality, protect new work and extract bounded slices when justified |

An external dependency does not automatically require a new ACL package: use the project's existing boundary when it already performs the translation. A shared kernel requires actual coordination; a common type name alone does not justify shared ownership.

## Record the Map

Include applicable contexts, model meanings, owners, upstream/downstream direction, exchange contracts and translation points. Show the current boundary separately from a proposed change. Capture only material coordination and consistency assumptions; do not force a diagram or create a second glossary when the authorized spec already explains the relationship.

Document locations and saving authorization follow the parent skill's shared spec-dev conventions.
