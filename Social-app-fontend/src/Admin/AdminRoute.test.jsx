import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { useSelector } from "react-redux";
import AdminRoute from "./AdminRoute";

jest.mock("react-redux", () => ({
  useSelector: jest.fn(),
}));

jest.mock(
  "react-router-dom",
  () => ({
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
  }),
  { virtual: true }
);

describe("AdminRoute", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("redirects unauthenticated users to /login", () => {
    useSelector.mockImplementation((selector) =>
      selector({ login: { isLoggedIn: false, roles: [] } })
    );
    render(
      <AdminRoute>
        <div>Secret</div>
      </AdminRoute>
    );
    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/login");
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });

  test("redirects non-staff users to /user/home", () => {
    useSelector.mockImplementation((selector) =>
      selector({ login: { isLoggedIn: true, roles: ["USER"] } })
    );
    render(
      <AdminRoute>
        <div>Secret</div>
      </AdminRoute>
    );
    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/user/home");
  });

  test("allows MODERATOR when requireAdmin is false", () => {
    useSelector.mockImplementation((selector) =>
      selector({ login: { isLoggedIn: true, roles: ["USER", "MODERATOR"] } })
    );
    render(
      <AdminRoute>
        <div>Staff Panel</div>
      </AdminRoute>
    );
    expect(screen.getByText("Staff Panel")).toBeInTheDocument();
  });

  test("redirects MODERATOR to /admin when requireAdmin is true", () => {
    useSelector.mockImplementation((selector) =>
      selector({ login: { isLoggedIn: true, roles: ["USER", "MODERATOR"] } })
    );
    render(
      <AdminRoute requireAdmin={true}>
        <div>Audit Logs</div>
      </AdminRoute>
    );
    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/admin");
    expect(screen.queryByText("Audit Logs")).not.toBeInTheDocument();
  });

  test("allows ADMIN when requireAdmin is true", () => {
    useSelector.mockImplementation((selector) =>
      selector({ login: { isLoggedIn: true, roles: ["USER", "ADMIN"] } })
    );
    render(
      <AdminRoute requireAdmin={true}>
        <div>Audit Logs</div>
      </AdminRoute>
    );
    expect(screen.getByText("Audit Logs")).toBeInTheDocument();
  });
});
