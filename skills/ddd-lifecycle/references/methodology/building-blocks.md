# Entities, Value Objects and Aggregate Boundaries

## Identity and Lifecycle

Use an entity when the business tracks the same thing through state changes; use a value object when equality is defined by its value. IDs, storage keys and object mutability follow the approved domain and persistence contracts. A database row or generated ID alone does not make a separate aggregate.

Value objects should preserve their value semantics and validate the rules actually applicable to them. Do not invent universal constraints such as “money cannot be negative”; refunds, balances and quantities have domain-specific rules.

## Choose the Consistency Boundary

For each operation, establish:

1. Which facts must remain true, including invalid inputs, concurrent requests and retries?
2. Which state changes must either all commit or all fail, and what does success mean to the caller?
3. Which effects may become visible later, for how long, and how are failure and recovery exposed?

Use the answers to define aggregate ownership and transaction scope. Keep the boundary as small as those invariants allow; independent identifiers and table boundaries do not justify splitting an atomic operation.

When a requirement spans existing aggregates, reconsider their boundaries and the feasible transaction design. State the accepted tradeoff if a use-case transaction coordinates multiple existing aggregates. Do not replace required atomicity with events merely to follow a pattern. Across separate stores/services, do not pretend a local transaction covers remote effects; clarify the required guarantee and feasible coordination or compensation before implementation.

## Preserve the Boundary in Code and Storage

- Route invariant-changing operations through the aggregate's public behavior. Other aggregates normally hold identifiers rather than writable internal object graphs.
- Define creation, transitions, deletion/retention and ownership explicitly; deleting a root does not automatically authorize deleting audit history or shared records.
- Protect concurrency at the actual write boundary. A prior query or an in-memory check alone cannot prevent concurrent violations; select the necessary database constraint, locking or version check and test it with real storage.
- Keep construction and loading distinct; see [repositories and factories](repositories-factories.md).

## Eventual Consistency

Use asynchronous propagation when the business accepts the delay and its failure states. Define which change commits first, how work is durably recorded, what may be duplicated, and how consumers recover. Publication and idempotency obligations are in [domain-events.md](domain-events.md).

## Boundary Probes

| Requirement | What the design must demonstrate |
|---|---|
| A room cannot have overlapping reservations | Concurrent writes cannot both commit an overlap; a query returning “none” before insertion is insufficient |
| A parent and its initial detail must be created atomically | Failure after either write leaves neither visible; separate IDs do not relax this guarantee |
| Two requests repeat one operation ID | A durable claim and its result distinguish retries from conflicting payloads; only one logical effect occurs |
| A notification may arrive later | Accepted delay, durable retry and failure visibility are explicit; local success is not remote delivery proof |

These probes validate chosen boundaries; they do not prescribe a new aggregate, event bus or microservice for every application.
