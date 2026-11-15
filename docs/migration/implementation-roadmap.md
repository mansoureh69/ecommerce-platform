# Implementation roadmap and provenance

The initial proposal was Identity and Catalog only. The user explicitly requested all seven modules; the implemented roadmap is:

1. Audit the supplied local Flower Shop checkout and record migration decisions before implementation.
2. Initialize an independent target Git repository, solution and technical BuildingBlocks.
3. Implement Identity and generic Catalog, then Pricing, Inventory and Cart with explicit application contracts.
4. Implement Orders checkout/cancellation/fulfillment and Payments manual settlement/refund with atomic cross-context transactions.
5. Add per-module initial migrations, PostgreSQL HTTP integration tests, domain tests, architecture enforcement, Docker and CI.
6. Document setup, supported workflows and operational limits.

All seven modules contain working domain, application and persistence code. The source is not used as a runtime/build dependency. No original migrations, settings, secrets, client assets or Git history were copied. `BuildingBlocks.Application/LoggingBehavior.cs` is the directly reused source implementation with its namespace changed. Entity/aggregate/event primitives, Money, validation, Identity/JWT, exception mapping, aggregate behaviors and persistence conventions were redesigned from the inspected source; their decisions and reasons are in the audit.

Future work requires explicit business contracts: online payment providers and verified webhooks; tax/shipping calculations; reservation expiration; promotions; returns/partial refunds; email verification/password recovery; token revocation; external notifications/outbox; and tenant isolation. These are not empty placeholder projects or simulated implementations in this release.
