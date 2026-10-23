# Domain Events and Delivery Boundaries

Introduce an event for an actual business occurrence and consumer need. Use a specific past-tense name, immutable occurrence identity and the data required by the published contract. Do not publish every storage mutation or serialize the entire internal object graph by default.

## Internal and Integration Events

Internal events use the context's domain language. At a context boundary, translate to the agreed integration contract; do not export internal models merely because their shape is convenient. Persisted or externally consumed events need an explicit schema-evolution policy, even if they began as “internal”.

Choose payload size from consumer needs, privacy and ownership. If consumers must query the producer, define the availability/consistency implications; if the payload carries facts directly, define their meaning at the occurrence time.

## Publication Failure

When an operation requires durable eventual publication, write the business state and publication intent in the same local transaction, then publish with retry. A database commit followed by a best-effort send leaves a loss window; a send before commit can expose an event for rolled-back state.

An outbox is one mechanism for this guarantee, not a mandatory dependency for all events. Verify the required durability, retry/retention policy and recovery path rather than treating the pattern name as proof of delivery.

## Duplicates and Idempotency

A publisher can crash after delivery but before recording acknowledgement; consumers can receive duplicates. A local in-memory set is not durable deduplication.

For a database consumer, claim the event identity and apply the local effect in the same transaction. A crash between recording “seen” and applying the effect must not permanently skip it. Concurrent deliveries need an atomic uniqueness/claim mechanism, not a check-then-insert race.

For operation-ID retries, bind the ID to the logical payload and recorded result. Same ID plus same payload may replay the result; same ID plus a different payload follows an explicit conflict contract. Normalization must preserve key/value association.

External side effects cannot be made atomic merely by wrapping local writes in a transaction. Use the provider's actual idempotency/reconciliation capabilities or the approved recovery/compensation design, and state the remaining limits.

## Event Sourcing and CQRS

Use event sourcing only when retaining/replaying domain history as the source of truth is a real requirement. Resolve event evolution, replay side effects, ordering, snapshots and historical validity before adoption. An audit log or outbox does not by itself make the system event-sourced.

Use separate read/write models where their different needs justify the synchronization and operational cost. Simple CRUD does not require CQRS, event sourcing or a broker.

## Validation

Exercise the relevant failures: rollback before commit, publish failure after commit, duplicate/concurrent delivery, consumer crash during processing and replay with changed schemas. Distinguish local transaction success, recorded publication intent and observed remote delivery in the result.
