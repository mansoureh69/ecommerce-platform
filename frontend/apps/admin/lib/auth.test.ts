import { readSession } from "@ecommerce/api-client/next";
import { describe, expect, it } from "vitest";
import { isAdmin } from "./auth";

const jwt = (payload: object) => `x.${btoa(JSON.stringify(payload)).replace(/=/g, "")}.y`;
const future = new Date(Date.now() + 3_600_000).toISOString();
const cookies = (values: Record<string, string>) => (name: string) => values[name];

describe("isAdmin", () => {
  it("requires an authenticated session with the Admin role", () => {
    expect(isAdmin({ authenticated: true, roles: ["Admin"] })).toBe(true);
    expect(isAdmin({ authenticated: true, roles: [] })).toBe(false);
    expect(isAdmin({ authenticated: true, roles: ["Customer"] })).toBe(false);
    expect(isAdmin({ authenticated: false, roles: ["Admin"] })).toBe(false);
  });
});

describe("readSession", () => {
  it("reads the role claim from a live session cookie", () => {
    const session = readSession(cookies({ s: jwt({ role: "Admin" }), s_expires: future }), "s");
    expect(session).toEqual({ authenticated: true, expiresAt: future, roles: ["Admin"] });
  });

  it("treats an expired cookie as signed out", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(readSession(cookies({ s: jwt({ role: "Admin" }), s_expires: past }), "s")).toEqual({ authenticated: false, expiresAt: null, roles: [] });
  });

  it("treats a missing cookie or garbage token as having no roles", () => {
    expect(readSession(cookies({}), "s").authenticated).toBe(false);
    expect(readSession(cookies({ s: "garbage", s_expires: future }), "s").roles).toEqual([]);
  });
});
