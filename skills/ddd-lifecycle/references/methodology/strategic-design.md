# Strategic Design and Modeling Effort

Classify a subdomain using the business's actual differentiation, rule complexity, replacement options and operational constraints. Do not classify it from its technology or label alone: identity, billing or infrastructure can have different roles in different businesses.

| Role | Investment decision |
|---|---|
| Core | Model the rules that provide real differentiation; make their ownership and invariants visible |
| Supporting | Build what is specific to this business, using the simplest design that satisfies it |
| Generic | Compare existing solutions with in-house work, including integration, control and maintenance costs |

These are design inputs, not mandates to buy software, split services, introduce patterns or assign developers by seniority. Simple CRUD can be correct in any role when its actual rules are simple.

## Distillation

- State which behavior creates value and which constraints distinguish it from supporting mechanisms.
- Keep unrelated infrastructure and generic mechanisms from obscuring the core rules, while retaining actual dependencies and transaction needs.
- Use a separate cohesive mechanism only when a real consumer and responsibility justify it. Prefer an existing library when it fits the approved constraints.
- A short domain vision or highlighted core section belongs in an existing authorized spec/ADR when useful; do not create a new document for every classification.

## Revisit the Decision

Reassess when business strategy, constraints, consumers or observed maintenance costs change. Record the changed evidence and affected boundary; do not use reclassification to reopen unrelated approved work or start a broad rewrite.
