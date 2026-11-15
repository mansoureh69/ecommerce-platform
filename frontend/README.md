# Frontend workspace

Two independently buildable applications live in `apps/`. Shared packages belong in `packages/` and must not contain storefront-specific presentation. The backend remains authoritative for commerce operations.

Use Node.js 24 and pnpm 11. Install with `pnpm install`, then run `pnpm build`, `pnpm lint`, and `pnpm typecheck`. Build either application independently with `pnpm --filter @ecommerce/admin build` or `pnpm --filter @ecommerce/storefront-khosheh build`.

Copy `.env.example` to each application's `.env.local` and set the server-only backend origin. Authentication uses application-specific HttpOnly cookies, and browser API requests pass through the same-origin BFF route.
