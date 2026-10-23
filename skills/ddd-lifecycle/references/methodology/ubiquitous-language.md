# Ubiquitous Language

Document locations, saving authorization and ADR lifecycle follow the [shared spec-dev conventions](../../../requirement-analysis/references/document-conventions.md). A resolved term does not itself authorize writing documents or changing implementation.

## Resolve Meaning in Scenarios

Use concrete actors, operations, states and failure cases to establish what a term means. Compare user language with the actual code and existing glossary. Surface ambiguity and conflicting definitions with their sources; keep unresolved meanings as questions rather than inventing a domain answer.

Use the chosen term consistently in relevant code, tests and authorized documentation. Domain experts' wording is evidence, not a requirement that every technical type have a business noun. A technical name is not automatically an invalid abstraction.

## Scope Terms

The same word may have different meanings in different contexts. Preserve the scope and translation rather than forcing one global definition. Distinguish synonyms from concepts with different lifecycle or authority.

Keep domain terms, definitions and applicable contexts in the glossary. General programming terms, file layouts and implementation decisions belong in their existing technical/spec locations. Reuse approved shared terms; keep feature-local meanings in the applicable spec.

## Evolve Deliberately

When a meaning changes, identify affected consumers and compatibility requirements before renaming code or public contracts. A code rename alone does not migrate data, external APIs or users' understanding. Use authorized examples or a bounded experiment to test a proposed model; do not turn modeling discussion into implicit implementation approval.
