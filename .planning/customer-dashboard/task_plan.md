# Customer dashboard redesign

## Goal

Implement the supplied customer-dashboard brief and push verified changes to the existing GitHub repository.

## Next Step

Delivery complete. See docs/qa/customer-dashboard-2026-11-16.md for verification and backend dependencies.

### Phase 1: Audit and proposed design

**Status:** complete

Routes, components, Prisma relations, account API ownership, authentication and unsupported features audited. Design is in docs/superpowers/specs/2026-11-16-customer-dashboard-design.md.

### Phase 2: Design review

**Status:** complete

Present the proposed design and get approval before application changes.

### Phase 3: Implementation

**Status:** complete

Create a detailed implementation plan after design approval. Implement customer shell, real-data overview, ticket wallet/detail, order history/detail, profile, settings and truthful favorites availability.

### Phase 4: Verification and GitHub delivery

**Status:** complete

Run lint/types/tests/build, real browser and responsive checks, document limitations, and commit/push each coherent verified change.

## Decisions

- Antislop during is the explicit session choice; do not save a global preference.
- Keep concurrent edits intact; use dedicated planning files to avoid replacing other active task records.
- Follow the new brief's Poppins requirement only in the customer area.
- Unsupported backend functionality must be documented and never simulated.

## Errors and observations

- No global antislop settings file exists; mode was resolved by the user's answer.
- Initial event-card path guess was wrong; shared EventCard is in common/event-presentation.tsx.
- Baseline lint has five pre-existing warnings; shared/API/web typecheck passes.
