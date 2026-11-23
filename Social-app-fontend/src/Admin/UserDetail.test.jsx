import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSelector } from "react-redux";
import UserDetail from "./UserDetail";
import { adminApi } from "./adminApi";

jest.mock("react-redux", () => ({
  useSelector: jest.fn(),
}));

const mockT = (key) => key;
const mockI18n = { language: "en" };

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT, i18n: mockI18n }),
}));

jest.mock(
  "react-router-dom",
  () => ({
    Link: ({ to, children, ...props }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useParams: () => ({ id: "10" }),
  }),
  { virtual: true }
);

jest.mock("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("./adminApi", () => ({
  adminApi: {
    user: jest.fn(),
    suspendUser: jest.fn(),
    banUser: jest.fn(),
    restoreUser: jest.fn(),
  },
  errorMessage: (err, fallback) => err?.message || fallback,
}));

jest.mock("../Utils/i88n", () => ({
  __esModule: true,
  default: { language: "en" },
}));

describe("UserDetail", () => {
  const suspendedUser = {
    id: 10,
    nickname: "target_user",
    fullname: "Target User",
    email: "target@example.com",
    roles: ["USER"],
    status: "SUSPENDED",
    postsCount: 3,
    reportsCount: 2,
    createdAt: "2026-11-01T00:00:00Z",
    reports: [],
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("hides restore and ban buttons for MODERATOR", async () => {
    useSelector.mockImplementation((selector) =>
      selector({
        login: { roles: ["MODERATOR"], userInfo: { id: 1 } },
      })
    );
    adminApi.user.mockResolvedValue(suspendedUser);

    render(<UserDetail />);

    await waitFor(() => {
      expect(screen.getByText("target_user")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "admin.suspend" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "admin.restore" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "admin.ban" })
    ).not.toBeInTheDocument();
  });

  test("shows restore and ban buttons for ADMIN and disables confirm until reasonCode is set", async () => {
    useSelector.mockImplementation((selector) =>
      selector({
        login: { roles: ["ADMIN"], userInfo: { id: 1 } },
      })
    );
    adminApi.user.mockResolvedValue(suspendedUser);

    render(<UserDetail />);

    await waitFor(() => {
      expect(screen.getByText("target_user")).toBeInTheDocument();
    });

    const restoreBtn = screen.getByRole("button", { name: "admin.restore" });
    expect(restoreBtn).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "admin.ban" })
    ).toBeInTheDocument();

    fireEvent.click(restoreBtn);
    const confirmBtn = screen.getByRole("button", { name: "admin.confirm" });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText("admin.table.reason"), {
      target: { value: "OTHER" },
    });
    expect(confirmBtn).not.toBeDisabled();
  });
});
