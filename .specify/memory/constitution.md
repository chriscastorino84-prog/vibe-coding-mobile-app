<!-- Sync Impact Report
- Version change: 0.0.0 -> 1.0.0
- Modified principles: N/A -> Mission & Product Identity, Program Experience & Progress, Program Content & Authoring, Integrity, Compliance & Affiliate Governance, Product Architecture & Data Security
- Added sections: Product & Compliance Constraints, Technical & Delivery Standards
- Removed sections: None in this ratification
- Follow-up TODOs: none
-->

# Goal-Based Training Program Platform Constitution

## Core Principles

### I. Mission & Product Identity
The product is a standalone, cross-platform mobile/web application for individually purchasable, goal-based workout training programs. It is independent of the founder's personal website and does not inherit or assume shared authentication, user records, or purchase history. The platform's differentiating pillar is data-driven progress visualization: every program purchase results in a trackable, graphable, gamified record of performance over time rather than a static PDF or video library. The long-term vision includes adjacent digital products such as e-books, cookbooks, and memoirs under the same commerce and account infrastructure, and no Phase 1+ architecture decision may foreclose that expansion.

### II. Program Experience & Progress
The Program is the unit of purchase. Each program is a discrete, independently priced product containing its own exercises, schedule, progression logic, strength-calculation method, and unique trophy/token artwork. There is no coaching layer in-app: programs are self-directed content, and any celebrity or influencer association must be clearly presented in program terms of sale to avoid user confusion and legal risk. Real-time progress updates occur at the end of a session or by the next calendar day, whichever comes first; any unrecorded set, rep, or weight values are saved as zero rather than null to preserve graph continuity. The gamified program card is a first-class UI object and must render live statistical dashboard data, performance graphs, user-submitted pre/post photos, and the program's unique trophy/token as two conceptually distinct faces of one card.

### III. Program Content & Authoring
Programs are authored only by the platform owner/team in v1. There is no self-serve creator marketplace, no third-party program upload flow, and no revenue-sharing infrastructure for trainer-authored content beyond the affiliate model. Every program must be defined by a program definition schema that includes metadata, structured workout schedule, a program-specific strength-calculation formula, and trophy/token unlock conditions. Programs may be associated with specific goals, celebrities, or influencers for marketing purposes; this is an expected content pattern and not an edge case.

### IV. Integrity, Compliance & Affiliate Governance
Any program associated with a real person's name, image, or likeness must have a documented licensing or endorsement agreement before publication. The platform data model must store and track the status of those agreements per program. Where affiliate commissions exist for a named individual, the platform must support transparent, auditable commission tracking and FTC-style disclosure at the point of sale or in marketing materials. The founder is advised to involve legal counsel before onboarding any celebrity- or influencer-branded program; this Constitution does not substitute for legal review.

### V. Product Architecture, Commerce & Data Security
Programs are sold as individual one-time or optionally subscription purchasable products through a unified commerce layer. The commerce and catalog layer must be product-type-agnostic so that programs, e-books, and future products share a common underlying model differentiated by type and fulfillment logic rather than entirely separate systems. Affiliate sales tracking is a core commerce feature from v1, not a bolt-on. User data is non-clinical but adopts a HIPAA-adjacent security posture by default: encryption at rest and in transit, private-by-default progress photos unless the user explicitly shares them, permanent deletion of account history and photos on request, and no sharing with the founder's personal website or other properties without explicit separate consent.

## Additional Constraints
The platform must support cross-platform delivery on iOS, Android, and web from a single codebase. The recommended baseline stack is React Native via Expo on the client, Supabase (Postgres, Auth, Storage, Realtime) for backend and data, and Stripe for payments, unless Phase 1 research proves a specific blocker. Offline support, precise 1RM and volume calculation engines, and other technical mechanics are explicitly deferred to Phase 1 as open research questions rather than resolved assumptions. No fixed budget or launch date is established at ratification; specs and plans must favor lean, incrementally shippable scope over large-bet assumptions. The system is expected to be built primarily by one founder with AI assistance, so all downstream specifications and tasking should be structured for autonomous execution by AI coding tools.

## Development Standards
All Phase 1+ documents must comply with this Constitution. A spec, plan, or task that conflicts with any Article is invalid until revised or this Constitution is formally amended. The product must prioritize maintainability, data integrity, user trust, and clear legal boundaries over short-term convenience. Any future functionality that touches pricing, affiliate attribution, user privacy, or program identity must be reviewed against this document before implementation. The Constitution is the supreme governing artifact for the project and takes precedence over implementation shortcuts, informal decisions, and downstream process exceptions.

## Governance
This Constitution may only be amended by explicit founder decision and may never be silently overridden by a downstream document. Any Phase 1+ spec, plan, or task that conflicts with an Article above must either be revised to comply or trigger a formal amendment before work proceeds. Version history must be preserved, and amendments must be dated and briefly justified. Compliance review is mandatory before feature work continues when a change alters product identity, commerce flow, legal risk, security posture, or product architecture.

**Version**: 1.0.0 | **Ratified**: 2026-09-22 | **Last Amended**: 2026-09-23
