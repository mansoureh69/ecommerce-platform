// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, middleware } from "./middleware";

const future = new Date(Date.now() + 3_600_000).toISOString();
const request = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie } : {} });

describe("admin middleware", () => {
  it("redirects signed-out visitors to the login page", () => {
    const response = middleware(request("/orders"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login?reason=expired");
  });

  it("redirects the bare root to login without an expiry notice", () => {
    expect(middleware(request("/")).headers.get("location")).toBe("http://localhost/login");
  });

  it("lets a live session through", () => {
    const cookie = `ecommerce_admin_session=x.e30.y; ecommerce_admin_session_expires=${encodeURIComponent(future)}`;
    expect(middleware(request("/orders", cookie)).headers.get("x-middleware-next")).toBe("1");
  });

  it("does not guard the login page or API routes", () => {
    expect(config.matcher[0]).toMatch(/login\|api/);
  });
});
