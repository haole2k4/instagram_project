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

const DURATIONS = [1, 3, 7, 30];

const UserDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { roles, userInfo } = useSelector((state) => state.login);
  const isAdmin = roles?.includes("ADMIN");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    reasonCode: "",
    note: "",
    durationDays: 7,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUser(await adminApi.user(id));
    } catch (requestError) {
      setError(errorMessage(requestError, t("admin.loadError")));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = (nextMode) => {
    setForm({ reasonCode: "", note: "", durationDays: 7 });
    setFormError("");
    setMode(nextMode);
  };

  const submit = async () => {
    setFormError("");
    if (!form.reasonCode) {
      setFormError(t("admin.reasonRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const body = { reasonCode: form.reasonCode, note: form.note || null };
      let updated;
      if (mode === "suspend") {
        updated = await adminApi.suspendUser(id, {
          ...body,
          durationDays: Number(form.durationDays),
        });
      } else if (mode === "ban") {
        updated = await adminApi.banUser(id, body);
      } else {
        updated = await adminApi.restoreUser(id, body);
      }
      setUser(updated);
      setMode(null);
      toast.success(t("admin.userActionSuccess"));
    } catch (requestError) {
      setFormError(errorMessage(requestError, t("admin.actionError")));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title={t("admin.userDetail")} />
        <div className="h-64 border border-[#161616]" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div>
        <Link
          to="/admin/users"
          className="mb-4 inline-flex items-center gap-2 text-[14px] text-[#b4b4b4] hover:text-white"
        >
          <ArrowLeft size={16} /> {t("admin.backToUsers")}
        </Link>
        <ErrorState message={error || t("admin.notFound")} onRetry={load} />
      </div>
    );
  }

  const isAdminTarget = user.roles?.includes("ADMIN");
  const isModeratorTarget = user.roles?.includes("MODERATOR");
  const canModerate =
    !isAdminTarget &&
    (!isModeratorTarget || isAdmin) &&
    user.id !== userInfo?.id;

  return (
    <div>
      <Link
        to="/admin/users"
        className="mb-4 inline-flex items-center gap-2 text-[14px] text-[#b4b4b4] hover:text-white"
      >
        <ArrowLeft size={16} /> {t("admin.backToUsers")}
      </Link>
      <PageHeader
        title={user.nickname || `#${user.id}`}
        description={user.fullname || user.email}
        action={<StatusDot status={user.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <section className="border border-[#161616] p-5">
            <h2 className="mb-4 text-[16px] font-medium">
              {t("admin.profile")}
            </h2>
            <dl className="grid grid-cols-1 gap-4 text-[13px] sm:grid-cols-2">
              <div>
                <dt className="text-[#6f6f6f]">{t("admin.table.email")}</dt>
                <dd className="mt-1">{user.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-[#6f6f6f]">{t("admin.table.phone")}</dt>
                <dd className="mt-1">{user.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-[#6f6f6f]">{t("admin.table.roles")}</dt>
                <dd className="mt-1">{user.roles?.join(" · ") || "—"}</dd>
              </div>
              <div>
                <dt className="text-[#6f6f6f]">{t("admin.table.joined")}</dt>
                <dd className="mt-1">{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-[#6f6f6f]">{t("admin.table.posts")}</dt>
                <dd className="mt-1 tabular-nums">{user.postsCount}</dd>
              </div>
              <div>
                <dt className="text-[#6f6f6f]">{t("admin.table.reports")}</dt>
                <dd className="mt-1 tabular-nums">{user.reportsCount}</dd>
              </div>
            </dl>
            {user.bio ? (
              <p className="mt-5 border-t border-[#161616] pt-4 text-[14px] text-[#b4b4b4]">
                {user.bio}
              </p>
            ) : null}
          </section>

          <section className="mt-6 border border-[#161616]">
            <div className="border-b border-[#161616] px-5 py-3">
              <h2 className="text-[16px] font-medium">
                {t("admin.recentReports")}
              </h2>
            </div>
            {user.reports?.length ? (
              <ul>
                {user.reports.map((report) => (
                  <li
                    key={report.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-[#161616] px-5 py-3 text-[13px] last:border-0"
                  >
                    <Link
                      to={`/admin/reports/${report.id}`}
                      className="text-white hover:text-[#0095f6]"
                    >
                      #{report.id} · {report.reasonCode}
                    </Link>
                    <div className="flex items-center gap-4 text-[#b4b4b4]">
                      <span>{formatDate(report.createdAt)}</span>
                      <StatusDot status={report.status} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-[14px] text-[#b4b4b4]">
                {t("admin.noReportsForUser")}
              </p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <section className="border border-[#161616] p-5">
            <h2 className="text-[16px] font-medium">{t("admin.accountActions")}</h2>
            <p className="mt-2 text-[12px] text-[#6f6f6f]">
              {t("admin.accountActionsHint")}
            </p>
            {user.statusReasonCode ? (
              <div className="mt-4 border-t border-[#161616] pt-4 text-[12px] text-[#b4b4b4]">
                <p>
                  {t("admin.table.reason")}: {user.statusReasonCode}
                </p>
                {user.statusReason ? <p className="mt-1">{user.statusReason}</p> : null}
                <p className="mt-1 text-[#6f6f6f]">
                  {formatDate(user.statusChangedAt)}
                </p>
              </div>
            ) : null}

            {canModerate ? (
              <div className="mt-5 space-y-2">
                {user.status !== "BANNED" ? (
                  <button
                    type="button"
                    className={btnSecondary + " w-full"}
                    onClick={() => openModal("suspend")}
                  >
                    {t("admin.suspend")}
                  </button>
                ) : null}
                {user.status !== "ACTIVE" ? (
                  <button
                    type="button"
                    className={btnPrimary + " w-full"}
                    onClick={() => openModal("restore")}
                  >
                    {t("admin.restore")}
                  </button>
                ) : null}
                {isAdmin && user.status !== "BANNED" ? (
                  <button
                    type="button"
                    className={btnDanger + " w-full"}
                    onClick={() => openModal("ban")}
                  >
                    {t("admin.ban")}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-[12px] text-[#6f6f6f]">
                {t("admin.protectedAccount")}
              </p>
            )}
          </section>
        </aside>
      </div>

      <Modal
        open={Boolean(mode)}
        title={
          mode === "suspend"
            ? t("admin.suspend")
            : mode === "ban"
              ? t("admin.ban")
              : t("admin.restore")
        }
        onClose={() => !submitting && setMode(null)}
        footer={
          <>
            <button
              type="button"
              className={btnSecondary}
              disabled={submitting}
              onClick={() => setMode(null)}
            >
              {t("admin.cancel")}
            </button>
            <button
              type="button"
              className={
                mode === "ban" || mode === "suspend" ? btnDanger : btnPrimary
              }
              disabled={submitting}
              onClick={submit}
            >
              {submitting ? t("admin.submitting") : t("admin.confirm")}
            </button>
          </>
        }
      >
        <p className="mb-4 text-[13px] text-[#b4b4b4]">
          {mode === "ban"
            ? t("admin.banWarning")
            : mode === "suspend"
              ? t("admin.suspendWarning")
              : t("admin.restoreWarning")}
        </p>
        <Field label={t("admin.table.reason")} htmlFor="user-action-reason">
          <select
            id="user-action-reason"
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
        {mode === "suspend" ? (
          <Field label={t("admin.duration")} htmlFor="user-action-duration">
            <select
              id="user-action-duration"
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
        <Field label={t("admin.note")} htmlFor="user-action-note">
          <textarea
            id="user-action-note"
            className={textareaClass}
            maxLength={500}
            value={form.note}
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

export default UserDetail;
