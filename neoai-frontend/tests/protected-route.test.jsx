import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "../src/components/ProtectedRoute";

const mockUseAuth = vi.fn();

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth()
}));

function renderProtectedRoute(routeElement, initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Login Screen</div>} />
        <Route path="/" element={<div>Dashboard Screen</div>} />
        <Route path="/admin" element={routeElement} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("redirects unauthenticated users to login", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null
    });

    renderProtectedRoute(
      <ProtectedRoute>
        <div>Secret Screen</div>
      </ProtectedRoute>,
      "/admin"
    );

    expect(screen.getByText("Login Screen")).toBeInTheDocument();
    expect(screen.queryByText("Secret Screen")).not.toBeInTheDocument();
  });

  it("renders protected content for an authenticated user", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: "DOCTOR" }
    });

    renderProtectedRoute(
      <ProtectedRoute>
        <div>Secret Screen</div>
      </ProtectedRoute>,
      "/admin"
    );

    expect(screen.getByText("Secret Screen")).toBeInTheDocument();
  });

  it("redirects users without the required role back to the dashboard", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: "DOCTOR" }
    });

    renderProtectedRoute(
      <ProtectedRoute requiredRole="ADMIN">
        <div>Admin Panel</div>
      </ProtectedRoute>,
      "/admin"
    );

    expect(screen.getByText("Dashboard Screen")).toBeInTheDocument();
    expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
  });
});
