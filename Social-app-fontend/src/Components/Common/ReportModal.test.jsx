import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReportModal, { REPORT_REASONS } from "./ReportModal";
import instance from "../../Utils/AxiosApi/Axios";
import { toast } from "react-toastify";

const mockT = (key) => key;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

jest.mock("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("../../Utils/AxiosApi/Axios", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

describe("ReportModal", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders all 11 spec reason codes and submits POST /reports", async () => {
    const onClose = jest.fn();
    instance.post.mockResolvedValue({ id: 1, status: "OPEN" });

    render(
      <ReportModal
        open={true}
        onClose={onClose}
        targetType="POST"
        targetId={55}
        targetLabel="alice"
      />
    );

    const select = screen.getByLabelText("report.reasonLabel");
    REPORT_REASONS.forEach((code) => {
      expect(
        screen.getByRole("option", { name: `report.reasons.${code}` })
      ).toBeInTheDocument();
    });
    expect(REPORT_REASONS).toHaveLength(11);

    const submitBtn = screen.getByRole("button", { name: "report.submit" });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(select, { target: { value: "SPAM" } });
    fireEvent.change(screen.getByLabelText("report.noteLabel"), {
      target: { value: "Repeated spam links" },
    });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(instance.post).toHaveBeenCalledWith("/reports", {
        targetType: "POST",
        targetId: 55,
        reasonCode: "SPAM",
        note: "Repeated spam links",
      });
    });

    expect(toast.success).toHaveBeenCalledWith("report.success");
    expect(onClose).toHaveBeenCalled();
  });

  test("shows specific error on 409 REPORT_ALREADY_EXISTS and REPORT_RATE_LIMIT", async () => {
    const onClose = jest.fn();
    instance.post.mockRejectedValueOnce({
      response: { status: 409, data: { error: "REPORT_ALREADY_EXISTS" } },
    });

    render(
      <ReportModal
        open={true}
        onClose={onClose}
        targetType="COMMENT"
        targetId={12}
      />
    );

    fireEvent.change(screen.getByLabelText("report.reasonLabel"), {
      target: { value: "HARASSMENT" },
    });
    fireEvent.click(screen.getByRole("button", { name: "report.submit" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("report.alreadyExists");
    });

    instance.post.mockRejectedValueOnce({
      response: { status: 409, data: { error: "REPORT_RATE_LIMIT" } },
    });

    fireEvent.click(screen.getByRole("button", { name: "report.submit" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("report.rateLimit");
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
