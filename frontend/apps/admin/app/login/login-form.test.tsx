import { ApiError } from "@ecommerce/api-client";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fakeClients, renderWithClients } from "../../test/render";
import { router } from "../../test/setup";
import { LoginForm } from "./login-form";

async function signIn() {
  await userEvent.type(screen.getByLabelText("Email"), "admin@example.test");
  await userEvent.type(screen.getByLabelText("Password"), "pw");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  it("validates before calling the server", async () => {
    const login = vi.fn();
    renderWithClients(<LoginForm />, fakeClients({}, {}, { login }));
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("sends administrators to the dashboard", async () => {
    const login = vi.fn().mockResolvedValue({ authenticated: true, expiresAt: "x", roles: ["Admin"] });
    renderWithClients(<LoginForm />, fakeClients({}, {}, { login }));
    await signIn();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("signs a non-admin back out and refuses access", async () => {
    const login = vi.fn().mockResolvedValue({ authenticated: true, expiresAt: "x", roles: ["Customer"] });
    const clients = fakeClients({}, {}, { login });
    router.replace.mockClear();
    renderWithClients(<LoginForm />, clients);
    await signIn();
    expect(await screen.findByRole("alert")).toHaveTextContent("does not have administrator access");
    expect(clients.session.logout).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows the backend error for bad credentials", async () => {
    const login = vi.fn().mockRejectedValue(new ApiError("Invalid credentials.", 401, "unauthorized"));
    renderWithClients(<LoginForm />, fakeClients({}, {}, { login }));
    await signIn();
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials.");
  });
});
