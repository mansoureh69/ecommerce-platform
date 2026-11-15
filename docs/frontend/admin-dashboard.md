# Admin dashboard (Phase 5)

`frontend/apps/admin` is a standalone Next.js app. It talks to the backend only through its own server-side proxy (`/api/backend/*`), which attaches the bearer token from an httpOnly cookie. The browser never holds the token.

## Routes

| Route | Purpose | Backend calls |
|---|---|---|
| `/login` | Admin sign-in; non-admin accounts are signed straight back out | `POST /api/auth/login` |
| `/dashboard` | Totals taken from list endpoints (`size=1` → `total`), recent orders | admin products, categories, inventory, orders |
| `/products`, `/products/new`, `/products/{id}` | Search, filter, create, edit, activate/publish, variants (SKU), images | `/api/admin/products…` |
| `/categories` | List, create, edit | `/api/admin/categories…` |
| `/pricing` | Read and set price per product | `GET /api/products/{id}/price`, `PUT /api/products/{id}/price` |
| `/inventory`, `/inventory/{productId}` | Stock, reservations, receive stock | `/api/admin/inventory…`, `POST /api/inventory/{id}/receipts` |
| `/orders`, `/orders/{id}` | List by status, detail, ship, deliver, cancel | `/api/admin/orders…`, `POST /api/orders/{id}/ship\|deliver` |
| `/payments`, `/payments/{orderId}` | Payment list and audit detail, manual settlement, manual refund | `/api/admin/payments…`, `/api/payments/manual-*` |

## Authorization

- `middleware.ts` redirects signed-out visitors; `app/(app)/layout.tsx` also requires the `Admin` role. Both read the (unverified) JWT payload through `readSession` for routing only.
- The backend `Admin` policy is the real authority. A role-less or forged cookie reaches the pages but every API call is refused (401/403 are shown as sign-in / permission messages).
- All responses carry `Cache-Control: no-store` (`next.config.ts`).

## Backend added for this phase

The existing endpoints were customer-scoped (ownership-checked) and had no lists. Added, admin-only:
`GET /api/admin/orders`, `GET /api/admin/orders/{id}`, `POST /api/admin/orders/{id}/cancel`, `GET /api/admin/payments`, `GET /api/admin/payments/{orderId}`, `GET /api/admin/inventory`, `GET /api/admin/inventory/{productId}`.

## Known gaps (not faked in the UI)

- No analytics/revenue API: the dashboard shows counts only.
- No customer lookup. Orders expose a customer id internally but the UI does not display it. No order search by customer or id.
- Category activation/deletion does not exist.
- Prices have no list endpoint: the pricing page fetches one price per visible product (20 per page).
- The inventory list shows product names for the first 100 products only; others show a short id.
- Stock can only be received, not adjusted down.
- `GET /products/{id}/price` is the public read; there is no admin price history.

## Testing

`pnpm --filter @ecommerce/admin test` (Vitest + Testing Library, fake API clients). Run `pnpm test` from `frontend/` for the workspace.
