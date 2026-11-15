# Frontend security

The Next.js BFF stores backend JWTs in application-specific HttpOnly, Secure-in-production, SameSite=Strict cookies. Browser JavaScript receives only session metadata. Mutating BFF requests reject a mismatched `Origin`, and the backend still enforces authentication, roles, ownership, prices, stock, and state transitions.

`BACKEND_API_URL` is server-only. Do not expose it or signing secrets through `NEXT_PUBLIC_*`. Sessions end when the backend's short-lived access token expires; refresh tokens are not implemented. Admin login checks the role returned in the backend-issued token for navigation, while every privileged request is independently authorized by the backend.
