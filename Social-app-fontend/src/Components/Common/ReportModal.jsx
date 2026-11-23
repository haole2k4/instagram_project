import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Flag, X } from "lucide-react";
import instance from "../../Utils/AxiosApi/Axios";

export const REPORT_REASONS = [
  "SPAM",
  "HARASSMENT",
  "HATE",
  "NUDITY",
  "VIOLENCE",
  "SELF_HARM",
  "FALSE_INFO",
  "IMPERSONATION",
  "SCAM",
  "POLICY_VIOLATION",
  "OTHER",
];

const ReportModal = ({
  open,
  onClose,
  targetType,
  targetId,
  targetLabel = "",
}) => {
  const { t } = useTranslation();
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setReasonCode("");
    setNote("");
    setError("");
    setSubmitting(false);
  }, [open, targetType, targetId]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!reasonCode) {
      setError(t("report.reasonRequired"));
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await instance.post("/reports", {
        targetType,
        targetId,
        reasonCode,
        note: note.trim() || null,
      });
      toast.success(t("report.success"));
      onClose();
    } catch (requestError) {
      const body = requestError?.response?.data;
      const code = body?.error || body?.code;
      if (requestError?.response?.status === 409 && code === "REPORT_ALREADY_EXISTS") {
        setError(t("report.alreadyExists"));
      } else if (requestError?.response?.status === 409 && code === "REPORT_RATE_LIMIT") {
        setError(t("report.rateLimit"));
      } else {
        setError(body?.message || body?.error || t("report.submitError"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={() => !submitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="ig-modal-panel w-full max-w-[440px] overflow-hidden rounded-panel border border-ig-border bg-ig-raised text-ig-text shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-ig-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Flag size={18} strokeWidth={1.5} className="text-ig-like" aria-hidden="true" />
            <h2 id="report-modal-title" className="text-[16px] font-semibold text-ig-text">
              {t("report.title")}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            aria-label={t("common.close")}
            className="rounded-lg p-1 text-ig-muted hover:text-ig-text"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {targetLabel ? (
            <p className="truncate text-[13px] text-ig-muted">
              {t("report.targetLabel", { target: targetLabel })}
            </p>
          ) : null}

          <div>
            <label
              htmlFor="report-reason-select"
              className="mb-1.5 block text-[13px] font-medium text-ig-muted"
            >
              {t("report.reasonLabel")}
            </label>
            <select
              id="report-reason-select"
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value)}
              className="h-10 w-full rounded-media border border-ig-border bg-ig-ground px-3 text-[14px] text-ig-text outline-none focus:border-ig-accent"
            >
              <option value="">{t("report.chooseReason")}</option>
              {REPORT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {t(`report.reasons.${reason}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="report-note-input"
              className="mb-1.5 block text-[13px] font-medium text-ig-muted"
            >
              {t("report.noteLabel")}
            </label>
            <textarea
              id="report-note-input"
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("report.notePlaceholder")}
              className="w-full resize-none rounded-media border border-ig-border bg-ig-ground px-3 py-2 text-[14px] text-ig-text placeholder-ig-faint outline-none focus:border-ig-accent"
            />
          </div>

          {error ? (
            <p role="alert" className="text-[12px] text-ig-like">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="ig-press rounded-control border border-ig-border bg-ig-surface px-4 py-2 text-[14px] font-medium text-ig-text hover:bg-ig-ground disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!reasonCode || submitting}
              className="ig-press rounded-control bg-ig-accent px-5 py-2 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? t("common.submitting") : t("report.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
