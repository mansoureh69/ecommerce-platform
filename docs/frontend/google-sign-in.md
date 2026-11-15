# Google sign-in (storefront)

Customers can sign in or register with Google on the Khosheh storefront. Admin sign-in stays email + password; Google accounts never receive the `Admin` role.

## Flow

1. The login/register page loads Google Identity Services and renders Google's button (only when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set).
2. Google returns an ID token to the browser. The browser posts it to the storefront BFF `POST /api/auth/google`.
3. The BFF forwards it to `POST /api/auth/google` on the API. The API verifies the signature, issuer, expiry, audience (`Google:ClientId`) and that the email is verified.
4. The API signs the user in with the same JWT as password login. The BFF stores it in the httpOnly session cookie; the browser never sees it.

## Account rules

- A Google account maps to a user by its Google subject id. First sign-in creates a customer with no password.
- If an email already belongs to a password account, Google sign-in is **refused** ("Sign in with your password"). Accounts are not linked by email, because registration does not verify email ownership.
- Google-created accounts have no password, so they cannot use password login.

## Setup (manual)

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → **Web application**.
2. Add the storefront origins under *Authorized JavaScript origins* (for example `http://localhost:3000` and your production domain). No redirect URI is needed.
3. Set the client id in both places:
   - API: `GOOGLE_CLIENT_ID` in `.env` (passed to the container as `Google__ClientId`).
   - Storefront: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in the storefront's environment (Vercel project variable). It is public, not a secret.
4. Restart the API and rebuild the storefront (the public variable is read at build time).

Leaving `GOOGLE_CLIENT_ID` empty disables the endpoint (it answers 401) and hides the button.

## Not verified

A real Google sign-in has not been run end to end: it needs a client id from your Google account. Verification is covered by integration tests with a fake token validator and a smoke test that a forged token is rejected through the BFF.
