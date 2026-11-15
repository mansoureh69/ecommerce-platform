# API integration

`CommerceApi` is the single typed entry point for backend requests. The contracts match the current C# records and use ASP.NET Core's camel-case JSON representation. Errors are normalized into `ApiError`, retaining RFC 7807 validation details and distinguishing authentication, authorization, not-found, conflict, domain, network, and server failures.

The public catalog supports pagination and category filtering. Search and sort are currently admin-only. Prices are fetched per product, and public stock availability is not exposed. Cart lines are product-level. Checkout sends the current cart version and a caller-generated idempotency key; pricing and inventory remain server-authoritative.

There is no order-list endpoint, customer profile endpoint, password recovery, refresh token, payment gateway, or variant-level price and inventory contract. UI work must not simulate these capabilities.

## Storefront Phase 4

The Khosheh storefront now implements the current customer commerce contract in English, Persian, and Arabic:

- `/[locale]/products` provides bounded pagination and category filtering.
- `/[locale]/products/[id]` shows Catalog media and descriptive variants, fetches the product-level price, and replaces the authenticated cart line quantity.
- `/[locale]/cart` resolves current product and price details for each backend cart line. Its subtotal is explicitly an estimate; checkout remains authoritative.
- `/[locale]/checkout` submits the current cart version, shipping address, and a stable UUID idempotency key. An unchanged retry reuses the same key and payload.
- `/[locale]/orders/[id]` reads the owned order returned by checkout and permits cancellation only while the backend reports `PendingPayment`.
- `/[locale]/account` exposes session and logout behavior without pretending that profile or order-history APIs exist.

The storefront never presents an online card charge. Newly placed orders are shown as awaiting the existing manual payment workflow. Conflict and domain responses keep the customer in the recovery flow instead of presenting a false confirmation.
