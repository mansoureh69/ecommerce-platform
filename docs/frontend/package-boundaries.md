# Frontend package boundaries

- `api-contracts`: TypeScript representations of implemented backend DTOs.
- `api-client`: framework-neutral HTTP transport, typed endpoint methods, normalized errors, and the Next.js BFF adapter.
- `ecommerce-core`: pure formatting and cart/checkout utilities. It does not duplicate server business rules.
- `ecommerce-hooks`: TanStack Query providers and hooks over the typed client.
- `ui-primitives`: accessible, visually neutral controls.
- `storefront-core`: reserved for shared storefront infrastructure when a real cross-store consumer exists.
- `config`: reserved for shared tool configuration when duplication appears.

Khosheh components and design tokens belong in `apps/storefront-khosheh`. Admin presentation belongs in `apps/admin`.
