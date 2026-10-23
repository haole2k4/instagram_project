import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

export const btnPrimary =
  "inline-flex h-9 items-center justify-center rounded-[4px] bg-[#0095f6] px-4 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-[#1877f2] disabled:cursor-not-allowed disabled:opacity-40";
export const btnSecondary =
  "inline-flex h-9 items-center justify-center rounded-[4px] border border-[#2a2a2a] px-4 text-[14px] font-medium text-white transition-colors duration-150 hover:border-[#3a3a3a] hover:bg-[#111] disabled:cursor-not-allowed disabled:opacity-40";
export const btnDanger =
  "inline-flex h-9 items-center justify-center rounded-[4px] border border-[#ff3040]/50 px-4 text-[14px] font-medium text-[#ff3040] transition-colors duration-150 hover:bg-[#ff3040]/10 disabled:cursor-not-allowed disabled:opacity-40";
export const inputClass =
  "h-9 w-full rounded-[4px] border border-[#2a2a2a] bg-[#0a0a0a] px-3 text-[14px] text-white outline-none transition-colors placeholder:text-[#6f6f6f] focus:border-[#0095f6]";
export const selectClass = inputClass + " pr-8";
export const textareaClass =
  "min-h-[88px] w-full rounded-[4px] border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-[14px] text-white outline-none transition-colors placeholder:text-[#6f6f6f] focus:border-[#0095f6]";

export const REASONS = [
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

const STATUS_DOT = {
  ACTIVE: "bg-white",
  OPEN: "bg-[#0095f6]",
  RESOLVED: "bg-white",
  VISIBLE: "bg-white",
  SUSPENDED: "border border-[#b4b4b4] bg-transparent",
  CLAIMED: "bg-[#b4b4b4]",
  DISMISSED: "bg-[#2a2a2a]",
  HIDDEN: "bg-[#2a2a2a]",
  BANNED: "bg-[#ff3040]",
};

const STATUS_TEXT = {
  SUSPENDED: "text-[#b4b4b4]",
  DISMISSED: "text-[#b4b4b4]",
  HIDDEN: "text-[#b4b4b4]",
  BANNED: "text-[#ff3040]",
};

export const StatusDot = ({ status }) => (
  <span className="inline-flex items-center gap-2 text-[14px]">
    <span
      aria-hidden="true"
      className={`h-[6px] w-[6px] rounded-full ${STATUS_DOT[status] || "bg-[#2a2a2a]"}`}
    />
    <span className={STATUS_TEXT[status] || "text-white"}>
      {status || "—"}
    </span>
  </span>
);

export const PageHeader = ({ title, description, action }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="text-[24px] font-semibold leading-8 text-white">{title}</h1>
      {description ? (
        <p className="mt-1 text-[14px] text-[#b4b4b4]">{description}</p>
      ) : null}
    </div>
    {action}
  </div>
);

export const ErrorState = ({ message, onRetry, retryLabel }) => {
  const { t } = useTranslation();
  return (
    <div className="border border-[#2a2a2a] p-6 text-[14px]">
      <p className="text-[#b4b4b4]">{message}</p>
      {onRetry ? (
        <button type="button" className={btnSecondary + " mt-4"} onClick={onRetry}>
          {retryLabel ?? t("admin.retry")}
        </button>
      ) : null}
    </div>
  );
};

export const LoadingRows = ({ rows = 5, colSpan = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, index) => (
      <tr key={index}>
        <td colSpan={colSpan} className="border-b border-[#161616] px-4 py-4">
          <div className="h-3 w-full max-w-[360px] bg-[#161616]" />
        </td>
      </tr>
    ))}
  </>
);

export const EmptyRow = ({ colSpan, children }) => (
  <tr>
    <td
      colSpan={colSpan}
      className="border-b border-[#161616] px-4 py-10 text-center text-[14px] text-[#b4b4b4]"
    >
      {children}
    </td>
  </tr>
);

export const Modal = ({ open, title, onClose, children, footer }) => {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-full w-full max-w-[520px] overflow-y-auto border border-[#2a2a2a] bg-[#0a0a0a]"
      >
        <div className="flex items-center justify-between border-b border-[#161616] px-5 py-4">
          <h2 className="text-[16px] font-medium text-white">{title}</h2>
          <button
            type="button"
            className="p-1 text-[#b4b4b4] hover:text-white"
            onClick={onClose}
            aria-label={t("admin.close")}
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-[#161616] px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const Field = ({ label, hint, children, htmlFor }) => (
  <div className="mb-4">
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-[12px] font-medium text-[#b4b4b4]"
    >
      {label}
    </label>
    {children}
    {hint ? <p className="mt-1 text-[12px] text-[#6f6f6f]">{hint}</p> : null}
  </div>
);

export const Pagination = ({ page, totalPages, totalElements, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#161616] px-4 py-3 text-[12px] text-[#b4b4b4]">
      <span>
        {t("admin.items", { count: totalElements ?? 0 })} ·{" "}
        {t("admin.pageOf", {
          page: (page ?? 0) + 1,
          totalPages: Math.max(totalPages ?? 1, 1),
        })}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className={btnSecondary}
          disabled={!page}
          onClick={() => onChange(page - 1)}
        >
          {t("admin.previous")}
        </button>
        <button
          type="button"
          className={btnSecondary}
          disabled={page + 1 >= (totalPages ?? 1)}
          onClick={() => onChange(page + 1)}
        >
          {t("admin.next")}
        </button>
      </div>
    </div>
  );
};

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const shorten = (value, length = 90) => {
  if (!value) return "—";
  return value.length > length ? value.slice(0, length - 3) + "..." : value;
};
