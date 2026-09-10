---
name: domain-feature-planning
description: Plan or refine changes to this repository's write slice by inspecting relevant code narrowly, grilling product and architectural boundaries with the user, and producing a decision-complete plan. Use for business rules involving aggregates, domain services, application orchestration, persistence atomicity, or downstream contracts under src/progress/write; do not use for implementation-only, read-side, or UI-only tasks.
---

# Domain Feature Planning

Plan write-side behavior collaboratively before implementation. The outcome is a decision-complete plan grounded in the current repository, not a generic DDD recommendation.

## Ground Narrowly

- Read the applicable `AGENTS.md` instructions first.
- Inspect only the proposed entry point, its closest domain objects, relevant ports, nearby tests, and consumers whose contract may change.
- Trace the current state transition and persistence boundary before asking questions.
- Discover repository facts from code. Ask the user only about intent, tradeoffs, or behavior that the repository cannot establish.
- Stop exploring once there is enough evidence to discuss the design. Do not scan the repository broadly for reassurance.

## Grill the Behavior

Translate the requested rule into concrete examples and boundaries. Probe only cases that can materially change the design, such as:

- threshold equality, rounding, and integer behavior;
- eligibility based on an individual item versus the whole operation;
- one transition versus repeated or surplus-scaled transitions;
- calendar gaps, retries, refreshes, and idempotency;
- historical snapshots versus current canonical state;
- archived, missing, newly introduced, or differently selected entities;
- stale inputs and whether to reject, skip, or overwrite;
- downstream results needed by UI feedback, celebrations, or other consumers.

Ask focused questions in small rounds. Explain the architectural tension and recommend a default before asking. When the user gives a counterexample, revise the model instead of defending the earlier design by inertia.

## Grill the Boundaries

Use these repository conventions as decision criteria, not slogans:

- Entities and value objects own invariants and behavior derived from state they own.
- A domain service owns a multi-object or multi-step business action when it does not naturally belong to one aggregate.
- A domain service receives domain inputs and returns domain decisions or transitions. It does not access repositories, clocks, units of work, logging, or UI.
- The application use case loads complete inputs, supplies time and external dependencies, calls domain behavior, maps results to public DTOs, and persists the result.
- The unit of work provides persistence atomicity. The domain operation provides business atomicity. Do not confuse the two.
- Infrastructure implements ports, storage, transactions, and observability.
- UI consumes an application contract; it must not reconstruct a business decision from unrelated query state.

For every proposed method or service, challenge:

- Does its name reveal all meaningful behavior, or hide a consequence?
- Why does each parameter exist, and who owns that data?
- Is the input a historical snapshot, a canonical aggregate, or a current selection?
- What happens when input collections differ?
- Can the operation remain deterministic and repository-free?
- What is returned, who persists it, and which invocation may expose it downstream?

Loading all canonical objects and passing them to a domain service is application orchestration; deciding which objects qualify remains domain behavior. Never put repository access into a domain service merely to avoid an explicit parameter.

## Make the Flow Explicit

Before finalizing the design, show:

1. The intended application call site.
2. The ordered steps inside the domain operation.
3. The input and result types, including the reason for each field.
4. The persistence sequence inside the unit of work.
5. Failure and retry behavior.
6. How changed output reaches downstream consumers without replaying on refresh.

Prefer immutable domain transitions. Make inconsistent state fail loudly when partial success would corrupt or conceal business behavior. Keep logging at an application or infrastructure boundary, and identify observability as follow-up work when the repository does not yet provide it.

## Finish With a Decision-Complete Plan

Do not finalize while a high-impact product or boundary decision remains unresolved. The final plan should be compact but implementable without further design choices and include:

- the chosen domain ownership and service/entity responsibilities;
- application orchestration and transaction boundaries;
- additions or changes to public interfaces and DTOs;
- story-shaped domain, application, persistence, and relevant UI/e2e scenarios;
- explicit assumptions, rounding rules, idempotency, and failure behavior.

Follow the repository's existing test and e2e conventions from `AGENTS.md`. When the current interaction supports rendered plans, wrap the final plan in a single `<proposed_plan>` block. This workflow ends with the plan; implementation requires a separate execution request and an execution-capable mode.
