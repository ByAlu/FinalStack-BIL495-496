import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "../src/pages/LoginPage";

const mockUseAuth = vi.fn();
const mockLogSimpleAction = vi.fn();
const mockCompleteAction = vi.fn();

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock("../src/services/actionLogger", () => ({
  ActionTypes: {
    LOGIN: "LOGIN"
  },
  logSimpleAction: (...args) => mockLogSimpleAction(...args),
  completeAction: (...args) => mockCompleteAction(...args)
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockLogSimpleAction.mockReset();
    mockCompleteAction.mockReset();
  });

  it("shows the default doctor credentials in the form", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      login: vi.fn()
    });

    renderLoginPage();

    expect(screen.getByLabelText(/username/i)).toHaveValue("doctor");
    expect(screen.getByLabelText(/password/i)).toHaveValue("doctor123");
    expect(screen.getByRole("button", { name: /sign in/i })).toBeEnabled();
  });

  it("submits credentials successfully and completes the action log", async () => {
    const login = vi.fn().mockResolvedValue("jwt-token");
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      login
    });
    mockLogSimpleAction.mockReturnValue({ id: "action-1" });

    renderLoginPage();

    await userEvent.clear(screen.getByLabelText(/username/i));
    await userEvent.type(screen.getByLabelText(/username/i), "admin");
    await userEvent.clear(screen.getByLabelText(/password/i));
    await userEvent.type(screen.getByLabelText(/password/i), "admin123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(login).toHaveBeenCalledWith({
      username: "admin",
      password: "admin123"
    });
    expect(mockLogSimpleAction).toHaveBeenCalledWith(
      "Login: admin",
      "LOGIN",
      "User authentication attempt",
      { username: "admin" }
    );
    expect(mockCompleteAction).toHaveBeenCalledWith("action-1", "SUCCEEDED");
    expect(screen.queryByText(/invalid username or password/i)).not.toBeInTheDocument();
  });

  it("shows an error message when login fails", async () => {
    const login = vi.fn().mockRejectedValue(new Error("Invalid username or password."));
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      login
    });
    mockLogSimpleAction.mockReturnValue({ id: "action-2" });

    renderLoginPage();

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(login).toHaveBeenCalledWith({
      username: "doctor",
      password: "doctor123"
    });
    expect(mockCompleteAction).toHaveBeenCalledWith("action-2", "FAILED");
    expect(await screen.findByText("Invalid username or password.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeEnabled();
  });
});
