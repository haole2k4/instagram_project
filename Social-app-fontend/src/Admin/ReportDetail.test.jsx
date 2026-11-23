import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSelector } from "react-redux";
import ReportDetail from "./ReportDetail";
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
    useParams: () => ({ id: "42" }),
  }),
  { virtual: true }
);

jest.mock("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("./adminApi", () => ({
  adminApi: {
    report: jest.fn(),
    claimReport: jest.fn(),
    decideReport: jest.fn(),
  },
  errorMessage: (err, fallback) => err?.message || fallback,
}));

jest.mock("../Utils/i88n", () => ({
  __esModule: true,
  default: { language: "en" },
}));

describe("ReportDetail", () => {
  beforeEach(() => {
    useSelector.mockImplementation((selector) =>
      selector({
        login: {
          roles: ["ADMIN"],
          userInfo: { id: 1 },
        },
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("does not crash while loading with null report and renders loaded report", async () => {
    adminApi.report.mockResolvedValue({
      id: 42,
      targetType: "POST",
      targetId: 99,
      targetPreview: "Offensive post caption",
      targetAuthorNickname: "baduser",
      reporterNickname: "reporter1",
      reasonCode: "SPAM",
      status: "OPEN",
      createdAt: "2026-11-20T10:00:00Z",
    });

    render(<ReportDetail />);

    expect(screen.getByText("admin.reportDetail")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Offensive post caption")).toBeInTheDocument();
    });
  });

  test("disables decision confirm button until reasonCode is selected", async () => {
    adminApi.report.mockResolvedValue({
      id: 42,
      targetType: "POST",
      targetId: 99,
      targetPreview: "Post preview",
      status: "OPEN",
      reasonCode: "SPAM",
      createdAt: "2026-11-20T10:00:00Z",
    });

    render(<ReportDetail />);

    await waitFor(() => {
      expect(screen.getByText("Post preview")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "admin.makeDecision" }));
    const confirmBtn = screen.getByRole("button", { name: "admin.confirm" });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText("admin.table.reason"), {
      target: { value: "SPAM" },
    });
    expect(confirmBtn).not.toBeDisabled();
  });
});
