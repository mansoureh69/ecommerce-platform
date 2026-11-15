# AGENTS.md — EcommercePlatform

## Project context
- Existing .NET 10 / ASP.NET Core ecommerce backend; frontend is a pnpm + Turborepo monorepo with Next.js apps.
- Initial frontend apps: `admin` and `storefront-khosheh`.
- Backend architecture: modular monolith, Clean Architecture, DDD, CQRS, PostgreSQL.
- Backend is protected unless the user explicitly requests backend work.

## Non-negotiable rules
1. Inspect the repository, Git status, and relevant files before changing anything.
2. Continue from the actual project state. Never restart completed phases or recreate existing work.
3. Preserve working features, API contracts, design systems, tests, and configuration.
4. Do not overwrite uncommitted work or discard user changes.
5. Keep changes focused. Avoid unnecessary abstractions, dependencies, refactors, or file moves.
6. Do not introduce micro-frontends, Module Federation, microservices, or multi-tenancy unless explicitly requested.
7. Storefronts are independent Next.js apps. Share neutral functionality, not brand-specific UI.
8. Keep Khosheh branding and design components inside its app; do not leak its theme into generic packages.
9. Never invent API endpoints, DTOs, environment variables, test results, or deployment status. Inspect the source of truth.
10. Never expose secrets or put private credentials in `NEXT_PUBLIC_` variables.

## Deployment architecture
- Goal: one monorepo, multiple independently buildable/deployable Next.js apps.
- Use existing pnpm workspace and Turborepo configuration; improve only where needed.
- App-only changes should build/deploy only that app.
- Shared-package changes should affect only actual dependents, determined from the workspace dependency graph.
- Backend-only changes must not automatically deploy every frontend.
- Each Vercel app has its own project, root directory, domain, and environment variables.
- Separate Vercel root directories alone do not prove deployment isolation; verify filtering behavior.
- Do not add empty future storefront apps.

## Safe workflow
1. Check `git status` and identify the current branch.
2. Read the relevant app/package configuration before editing.
3. State a short plan for non-trivial changes.
4. Make the smallest safe change.
5. Run relevant build, lint, typecheck, and tests.
6. Report exact commands and outcomes. Mark unavailable checks as NOT VERIFIED.
7. Summarize changed files, risks, and manual steps.

## Current project handoff
- The original frontend implementation agent is working on Phase 4: Khosheh storefront.
- Do not run deployment-infrastructure changes against the same working tree while Phase 4 is active.
- Start the independent-deployment task only after Phase 4 is complete, verified, and committed.
- Prefer a separate Git branch/worktree for the second agent.
- First audit current pnpm, Turborepo, Next.js, GitHub Actions, and Vercel setup. Do not assume anything is missing.

## Scope for the deployment agent
Implement or document only what is missing for:
- independent app builds;
- dependency-aware affected-app detection;
- GitHub Actions validation/deployment workflows;
- separate Vercel project setup;
- environment-variable separation;
- deployment-isolation verification.

Do not redesign Khosheh or change backend code.

## Completion report
Use these headings:
- Implemented
- Tested and verified
- Not verified
- Manual setup required
- Files changed
- Remaining risks
