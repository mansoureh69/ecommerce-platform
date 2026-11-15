# Frontend architecture

The frontend is a pnpm and Turborepo workspace under `frontend/`. `apps/admin` and `apps/storefront-khosheh` are independent Next.js applications. Shared packages contain transport, contracts, commerce behavior, hooks, and neutral primitives. Storefront presentation stays in the storefront application.

Both applications use a same-origin Backend-for-Frontend route. The browser calls `/api/backend/*`; the Next.js server forwards the request to the ASP.NET Core API and attaches the JWT from an HttpOnly cookie. The backend remains authoritative for identity, roles, price, inventory, cart versions, checkout, and order ownership.

React Server Components remain the default. Client components are limited to providers, forms, and interactive data hooks.

The Phase 4 storefront keeps localized route shells as Server Components and isolates React Query, cart mutations, checkout form state, and gallery interaction in client leaves. Authentication-aware cart queries are disabled until the same-origin session endpoint confirms a signed-in customer, avoiding expected anonymous 401 requests. The header reads the cached session/cart state and links every commerce screen through locale-preserving routes.
