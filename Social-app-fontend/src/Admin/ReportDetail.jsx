import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ArrowLeft } from "lucide-react";
import { adminApi, errorMessage } from "./adminApi";
import {
  ErrorState,
  Field,
  Modal,
  PageHeader,
  REASONS,
  StatusDot,
  btnDanger,
  btnPrimary,
  btnSecondary,
  formatDate,
  selectClass,
  textareaClass,
} from "./AdminUI";

const ACTIONS = ["DISMISS", "HIDE_CONTENT", "SUSPEND_USER", "BAN_USER"];
const DURATIONS = [1, 3, 7, 30];

const ReportDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { roles, userInfo } = useSelector((state) => state.login);
  const isAdmin = roles?.includes("ADMIN");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    action: "DISMISS",
    reasonCode: "",
    note: "",
    durationDays: 7,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await adminApi.report(id));
    } catch (requestError) {
      setError(errorMessage(requestError, t("admin.loadError")));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const assigneeIsOther =
    report?.assigneeId &&
    report.assigneeId !== userInfo?.id &&
    !isAdmin;
  const canDecide =
    report &&
    ["OPEN", "CLAIMED"].includes(report.status) &&
    !assigneeIsOther;

  const claim = async () => {
    try {
      setReport(await adminApi.claimReport(id));
      toast.success(t("admin.claimSuccess"));
    } catch (requestError) {
      toast.error(errorMessage(requestError, t("admin.actionError")));
    }
  };

  const decide = async () => {
    setFormError("");
    if (!form.reasonCode) {
      setFormError(t("admin.reasonRequired"));
      return;
    }
    if (form.action === "SUSPEND_USER" && !form.durationDays) {
      setFormError(t("admin.durationRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        action: form.action,
        reasonCode: form.reasonCode,
        note: form.note || null,
      };
      if (form.action === "SUSPEND_USER") {
        body.durationDays = Number(form.durationDays);
      }
      const updated = await adminApi.decideReport(id, body);
      setReport(updated);
      setModalOpen(false);
      toast.success(t("admin.decisionSuccess"));
    } catch (requestError) {
      setFormError(errorMessage(requestError, t("admin.actionError")));
    } finally {
      setSubmitting(false);
    }
  };

  const availableActions = ACTIONS.filter((action) => {
    if (action === "HIDE_CONTENT") {
      return ["POST", "COMMENT"].includes(report.targetType);
    }
    if (action === "BAN_USER") return isAdmin;
    return true;
  });

  if (loading) {
    return (
      <div>
        <PageHeader title={t("admin.reportDetail")} />
        <div className="h-64 border border-[#161616]" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div>
        <Link
          to="/admin/reports"
          className="mb-4 inline-flex items-center gap-2 text-[14px] text-[#b4b4b4] hover:text-white"
        >
          <ArrowLeft size={16} /> {t("admin.backToReports")}
        </Link>
        <ErrorState
          message={error || t("admin.notFound")}
          onRetry={load}
        />
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/admin/reports"
        className="mb-4 inline-flex items-center gap-2 text-[14px] text-[#b4b4b4] hover:text-white"
      >
        <ArrowLeft size={16} /> {t("admin.backToReports")}
      </Link>
      <PageHeader
        title={`${t("admin.reportDetail")} #${report.id}`}
        description={`${report.targetType} · ${formatDate(report.createdAt)}`}
        action={<StatusDot status={report.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <section className="border border-[#161616] p-5">
            <p className="mb-2 text-[11px] text-[#6f6f6f]">
              {t("admin.targetSnapshot")}
            </p>
            <p className="text-[16px] leading-6 text-white">
              {report.targetPreview || t("admin.contentUnavailable")}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
              <div>
                <span className="text-[#6f6f6f]">{t("admin.table.target")}: </span>
                {report.targetType} #{report.targetId}
              </div>
              <div>
                <span className="text-[#6f6f6f]">{t("admin.table.author")}: </span>
                {report.targetAuthorNickname || "—"}
              </div>
              <div>
                <span className="text-[#6f6f6f]">{t("admin.table.reporter")}: </span>
                {report.reporterNickname || "—"}
              </div>
              <div>
                <span className="text-[#6f6f6f]">{t("admin.table.reason")}: </span>
                {report.reasonCode}
              </div>
            </div>
            {report.note ? (
              <div className="mt-4 border-t border-[#161616] pt-4">
                <p className="text-[11px] text-[#6f6f6f]">{t("admin.reportNote")}</p>
                <p className="mt-1 text-[14px] text-[#b4b4b4]">{report.note}</p>
              </div>
            ) : null}
          </section>

          <section className="mt-6 border border-[#161616] p-5">
            <h2 className="mb-3 text-[16px] font-medium">
              {t("admin.decisionHistory")}
            </h2>
            {report.decidedAt ? (
              <dl className="grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
                <div>
                  <dt className="text-[#6f6f6f]">{t("admin.table.action")}</dt>
                  <dd className="mt-1">{report.action || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[#6f6f6f]">{t("admin.table.decidedBy")}</dt>
                  <dd className="mt-1">{report.decidedByNickname || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[#6f6f6f]">{t("admin.table.decidedAt")}</dt>
                  <dd className="mt-1">{formatDate(report.decidedAt)}</dd>
                </div>
                <div>
                  <dt className="text-[#6f6f6f]">{t("admin.decisionNote")}</dt>
                  <dd className="mt-1">{report.decisionNote || "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-[14px] text-[#b4b4b4]">
                {t("admin.noDecision")}
              </p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <section className="border border-[#161616] p-5">
            <h2 className="text-[16px] font-medium">{t("admin.decisionPanel")}</h2>
            <dl className="mt-4 space-y-3 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-[#6f6f6f]">{t("admin.table.assignee")}</dt>
                <dd>{report.assigneeNickname || t("admin.unassigned")}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6f6f6f]">{t("admin.table.status")}</dt>
                <dd>
                  <StatusDot status={report.status} />
                </dd>
              </div>
            </dl>

            {assigneeIsOther ? (
              <p className="mt-4 text-[12px] text-[#ff3040]">
                {t("admin.claimedByOther")}
              </p>
            ) : null}

            <div className="mt-5 space-y-2">
              {report.status === "OPEN" ? (
                <button
                  type="button"
                  className={btnSecondary + " w-full"}
                  onClick={claim}
                >
                  {t("admin.claim")}
                </button>
              ) : null}
              <button
                type="button"
                className={
                  (report.action === "BAN_USER" ? btnDanger : btnPrimary) +
                  " w-full"
                }
                disabled={!canDecide}
                onClick={() => {
                  setFormError("");
                  setModalOpen(true);
                }}
              >
                {t("admin.makeDecision")}
              </button>
            </div>
          </section>
        </aside>
      </div>

      <Modal
        open={modalOpen}
        title={t("admin.makeDecision")}
        onClose={() => !submitting && setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              className={btnSecondary}
              disabled={submitting}
              onClick={() => setModalOpen(false)}
            >
              {t("admin.cancel")}
            </button>
            <button
              type="button"
              className={form.action === "BAN_USER" ? btnDanger : btnPrimary}
              disabled={submitting}
              onClick={decide}
            >
              {submitting ? t("admin.submitting") : t("admin.confirm")}
            </button>
          </>
        }
      >
        <p className="mb-4 text-[13px] text-[#b4b4b4]">
          {t("admin.decisionWarning")}
        </p>
        <Field label={t("admin.table.action")} htmlFor="decision-action">
          <select
            id="decision-action"
            className={selectClass}
            value={form.action}
            onChange={(event) =>
              setForm((current) => ({ ...current, action: event.target.value }))
            }
          >
            {availableActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("admin.table.reason")} htmlFor="decision-reason">
          <select
            id="decision-reason"
            className={selectClass}
            value={form.reasonCode}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                reasonCode: event.target.value,
              }))
            }
          >
            <option value="">{t("admin.chooseReason")}</option>
            {REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </Field>
        {form.action === "SUSPEND_USER" ? (
          <Field label={t("admin.duration")} htmlFor="decision-duration">
            <select
              id="decision-duration"
              className={selectClass}
              value={form.durationDays}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  durationDays: event.target.value,
                }))
              }
            >
              {DURATIONS.map((days) => (
                <option key={days} value={days}>
                  {t("admin.days", { days: days })}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label={t("admin.note")} htmlFor="decision-note">
          <textarea
            id="decision-note"
            className={textareaClass}
            value={form.note}
            maxLength={1000}
            onChange={(event) =>
              setForm((current) => ({ ...current, note: event.target.value }))
            }
            placeholder={t("admin.notePlaceholder")}
          />
        </Field>
        {formError ? (
          <p role="alert" className="text-[12px] text-[#ff3040]">
            {formError}
          </p>
        ) : null}
      </Modal>
    </div>
  );
};

export default ReportDetail;
