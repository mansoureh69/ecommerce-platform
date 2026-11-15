# Verification record

Verified locally on 2026-11-10 with .NET SDK 10.0.301 and PostgreSQL 17 in an isolated Docker container.

- Release solution build succeeded with warnings treated as errors.
- 13 domain/unit cases passed.
- 3 architecture tests passed.
- 9 PostgreSQL HTTP integration tests passed; no tests skipped.
- All seven initial EF migrations applied to a fresh test database. Every context reports no pending model changes and owns its schema.
- Linux production Docker image built successfully. Its runtime `--migrate` command applied all seven migrations to a separate disposable database; `/health/ready` returned Healthy and `/api/products` returned a valid empty page. Temporary API containers and smoke databases were removed afterward.
- Checkout tests cover authoritative pricing, cart version/idempotency, ownership, insufficient-stock rollback and competing purchases of the last unit.
- Settlement tests cover authorization, amount matching, duplicate-reference rollback across already-saved contexts, idempotent settlement/refund, cancellation and fulfillment transitions.
- Identity tests exercise real registration/login, signed JWTs, denied unauthorized/forbidden requests and persisted lockout.
- Source working-tree status remained the original modified Program.cs and untracked ARCHITECTURE_REVIEW.md. Source files were never written by the migration work.

One integration failure found during development involved EF treating domain-assigned child GUIDs as existing rows; explicit ValueGeneratedNever mappings fixed it. NuGet vulnerability auditing also caught OpenAPI 2.0.0 transitively; the target pins the source's patched Microsoft.OpenApi 2.7.5.

This is verification of the implemented initial workflows, not a claim of load testing, independent security review or live payment-provider certification. See the README and architecture overview for supported scope and limits.
