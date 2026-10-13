import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";

import { routeTree } from "@/routeTree.gen";

// Minimal fake of the SmartPay API, keyed by "METHOD /path".
type Handler = (body: unknown) => { status: number; json?: unknown } | "network-error";
let routes: Record<string, Handler>;
let calls: { key: string; init?: RequestInit }[];

beforeEach(() => {
  calls = [];
  routes = {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const key = `${init?.method ?? "GET"} ${new URL(url).pathname}`;
      calls.push({ key, init });
      const h = routes[key];
      if (!h) throw new Error(`Unhandled request ${key}`);
      const r = h(init?.body ? JSON.parse(String(init.body)) : undefined);
      if (r === "network-error") throw new TypeError("Failed to fetch");
      return new Response(JSON.stringify(r.json ?? null), { status: r.status });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderApp(path = "/") {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) });
  render(<RouterProvider router={router} />);
  return router;
}

const unauth = () => ({ status: 401, json: { message: "Unauthorized" } });
const me = { userId: "u-1", email: "merchant@example.com" };

describe("session restore", () => {
  it("shows the login page at / when /auth/me returns 401", async () => {
    routes["GET /auth/me"] = unauth;
    renderApp("/");
    expect(await screen.findByRole("heading", { name: "Welcome" })).toBeInTheDocument();
    // Cookie auth requires credentials on every request.
    expect(calls[0]!.init?.credentials).toBe("include");
  });

  it("skips login and shows home when /auth/me succeeds", async () => {
    routes["GET /auth/me"] = () => ({ status: 200, json: me });
    renderApp("/");
    expect(await screen.findByText("merchant@example.com")).toBeInTheDocument();
  });

  it("redirects a logged-out visitor from /home to the login page", async () => {
    routes["GET /auth/me"] = unauth;
    renderApp("/home");
    expect(await screen.findByRole("heading", { name: "Welcome" })).toBeInTheDocument();
  });

  it("treats a network failure as unknown, not as logged out", async () => {
    routes["GET /auth/me"] = () => "network-error";
    renderApp("/");
    expect(await screen.findByText("Can't reach SmartPay")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Welcome" })).not.toBeInTheDocument();
  });
});

describe("login", () => {
  it("logs in, then fetches /auth/me and lands on home", async () => {
    let loggedIn = false;
    routes["GET /auth/me"] = () => (loggedIn ? { status: 200, json: me } : unauth());
    routes["POST /auth/login"] = (body) => {
      expect(body).toEqual({ email: "merchant@example.com", password: "secret123" });
      loggedIn = true;
      return { status: 200, json: { message: "Login successful" } };
    };
    renderApp("/");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Email"), "merchant@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("merchant@example.com")).toBeInTheDocument();
    expect(calls.map((c) => c.key)).toEqual(["GET /auth/me", "POST /auth/login", "GET /auth/me"]);
  });

  it("shows a friendly message for wrong credentials (401)", async () => {
    routes["GET /auth/me"] = unauth;
    routes["POST /auth/login"] = unauth;
    renderApp("/");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  });
});

describe("register", () => {
  async function fillAndSubmit() {
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Business name"), "Example Business");
    await user.type(screen.getByLabelText("Email"), "merchant@example.com");
    await user.type(screen.getByLabelText("Phone number"), "+265 99 123 4567");
    await user.type(screen.getByLabelText("Password"), "ExamplePassword123!");
    await user.click(screen.getByRole("button", { name: "Sign up" }));
  }

  it("sends the contract payload, then returns to login with a success note", async () => {
    routes["GET /auth/me"] = unauth;
    routes["POST /auth/register"] = (body) => {
      expect(body).toEqual({
        name: "Example Business",
        email: "merchant@example.com",
        password: "ExamplePassword123!",
        phone: "+265991234567",
      });
      return { status: 201, json: { message: "Registration successful", email: "merchant@example.com" } };
    };
    renderApp("/register");
    await fillAndSubmit();
    expect(await screen.findByRole("heading", { name: "Welcome" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Account created");
  });

  it("explains a duplicate email (409)", async () => {
    routes["GET /auth/me"] = unauth;
    routes["POST /auth/register"] = () => ({ status: 409, json: { message: "Conflict" } });
    renderApp("/register");
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("already registered");
  });

  it("shows backend validation messages (400, array form)", async () => {
    routes["GET /auth/me"] = unauth;
    routes["POST /auth/register"] = () => ({ status: 400, json: { message: ["phone must be a valid phone number"] } });
    renderApp("/register");
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("phone must be a valid phone number");
  });
});

describe("logout", () => {
  it("calls /auth/logout and returns to the login page", async () => {
    let loggedIn = true;
    routes["GET /auth/me"] = () => (loggedIn ? { status: 200, json: me } : unauth());
    routes["POST /auth/logout"] = () => {
      loggedIn = false;
      return { status: 200, json: { message: "Logged out successfully" } };
    };
    renderApp("/home");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Logout" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Welcome" })).toBeInTheDocument());
  });

  it("stays on home and shows an error if logout fails", async () => {
    routes["GET /auth/me"] = () => ({ status: 200, json: me });
    routes["POST /auth/logout"] = () => "network-error";
    renderApp("/home");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Logout" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't log out");
    expect(screen.getByText("merchant@example.com")).toBeInTheDocument();
  });
});
