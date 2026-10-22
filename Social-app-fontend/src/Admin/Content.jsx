import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { adminApi, errorMessage } from "./adminApi";
import {
  EmptyRow,
  ErrorState,
  Field,
  LoadingRows,
  Modal,
  Pagination,
  PageHeader,
  REASONS,
  StatusDot,
  btnDanger,
  btnPrimary,
  btnSecondary,
  formatDate,
  inputClass,
  selectClass,
  shorten,
  textareaClass,
} from "./AdminUI";

const TYPES = ["POST", "COMMENT", "STORY"];

const Content = () => {
  const { t } = useTranslation();
  const { roles } = useSelector((state) => state.login);
  const isAdmin = roles?.includes("ADMIN");
  const [type, setType] = useState("POST");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState("HIDE");
  const [form, setForm] = useState({ reasonCode: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { type, state: stateFilter, page, size: 20 };
      if (q) params.q = q;
      setData(await adminApi.content(params));
    } catch (requestError) {
      setError(errorMessage(requestError, t("admin.loadError")));
    } finally {
      setLoading(false);
    }
  }, [type, stateFilter, q, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openAction = (item, nextAction) => {
    setSelected(item);
    setAction(nextAction);
    setForm({ reasonCode: "", note: "" });
    setFormError("");
  };

  const submit = async () => {
    setFormError("");
    if (!form.reasonCode) {
      setFormError(t("admin.reasonRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.moderateContent(selected.type, selected.id, {
        action,
        reasonCode: form.reasonCode,
        note: form.note || null,
      });
      setSelected(null);
      toast.success(t("admin.contentActionSuccess"));
      load();
    } catch (requestError) {
      setFormError(errorMessage(requestError, t("admin.actionError")));
    } finally {
      setSubmitting(false);
    }
  };

  const rows = data?.content || [];

  return (
    <div>
      <PageHeader
        title={t("admin.content")}
        description={t("admin.contentDescription")}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex h-9 items-center gap-1 border border-[#2a2a2a] p-1">
          {TYPES.map((item) => (
            <button
              key={item}
              type="button"
              className={
                item === type
                  ? "h-7 rounded-[3px] bg-white px-3 text-[12px] font-medium text-black"
                  : "h-7 px-3 text-[12px] text-[#b4b4b4] hover:text-white"
              }
              onClick={() => {
                setType(item);
                setPage(0);
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(0);
            setQ(query.trim());
          }}
        >
          <div>
            <label className="mb-1 block text-[11px] text-[#6f6f6f]" htmlFor="content-search">
              {t("admin.search")}
            </label>
            <input
              id="content-search"
              className={inputClass + " !w-56"}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("admin.searchContent")}
            />
          </div>
          <button type="submit" className={btnSecondary}>
            {t("admin.searchAction")}
          </button>
        </form>
        <div>
          <label className="mb-1 block text-[11px] text-[#6f6f6f]" htmlFor="content-state">
            {t("admin.filters.state")}
          </label>
          <select
            id="content-state"
            className={selectClass + " !w-40"}
            value={stateFilter}
            onChange={(event) => {
              setStateFilter(event.target.value);
              setPage(0);
            }}
          >
            {["ALL", "VISIBLE", "HIDDEN"].map((state) => (
              <option key={state} value={state}>
                {state === "ALL" ? t("admin.all") : state}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <div className="overflow-x-auto border border-[#161616]">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead className="sticky top-14 z-10 bg-black">
            <tr className="h-10 border-b border-[#161616] text-[11px] font-medium text-[#b4b4b4]">
              <th className="px-4">{t("admin.table.preview")}</th>
              <th className="px-4">{t("admin.table.author")}</th>
              <th className="px-4">{t("admin.table.status")}</th>
              <th className="px-4">{t("admin.table.reason")}</th>
              <th className="px-4 text-right">{t("admin.table.reports")}</th>
              <th className="px-4">{t("admin.table.createdAt")}</th>
              <th className="px-4 text-right">{t("admin.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRows rows={6} colSpan={7} /> : null}
            {!loading && !rows.length ? (
              <EmptyRow colSpan={7}>{t("admin.emptyContent")}</EmptyRow>
            ) : null}
            {!loading
              ? rows.map((item) => (
                  <tr
                    key={`${item.type}-${item.id}`}
                    className="h-[52px] border-b border-[#161616] text-[14px] transition-colors duration-150 last:border-0 hover:bg-[#111]"
                  >
                    <td className="px-4">
                      <span className="mr-2 text-[11px] text-[#6f6f6f]">
                        #{item.id}
                      </span>
                      <span
                        className="inline-block max-w-[280px] truncate align-middle"
                        title={item.preview || ""}
                      >
                        {shorten(item.preview, 70) || "—"}
                      </span>
                    </td>
                    <td className="max-w-[160px] truncate px-4 text-[#b4b4b4]">
                      {item.authorNickname || "—"}
                    </td>
                    <td className="px-4">
                      <StatusDot status={item.state} />
                    </td>
                    <td className="px-4 text-[#b4b4b4]">
                      {item.reasonCode || "—"}
                    </td>
                    <td className="px-4 text-right tabular-nums">
                      {item.reportCount}
                    </td>
                    <td className="whitespace-nowrap px-4 text-[#b4b4b4]">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 text-right">
                      {item.state === "VISIBLE" ? (
                        <button
                          type="button"
                          className="text-[14px] text-[#ff3040] hover:underline"
                          onClick={() => openAction(item, "HIDE")}
                        >
                          {t("admin.hide")}
                        </button>
                      ) : null}
                      {item.state === "HIDDEN" && isAdmin ? (
                        <button
                          type="button"
                          className="text-[14px] text-white hover:underline"
                          onClick={() => openAction(item, "RESTORE")}
                        >
                          {t("admin.restore")}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
        {data ? (
          <Pagination
            page={data.number}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            onChange={setPage}
          />
        ) : null}
      </div>

      <Modal
        open={Boolean(selected)}
        title={action === "HIDE" ? t("admin.hideContent") : t("admin.restoreContent")}
        onClose={() => !submitting && setSelected(null)}
        footer={
          <>
            <button
              type="button"
              className={btnSecondary}
              disabled={submitting}
              onClick={() => setSelected(null)}
            >
              {t("admin.cancel")}
            </button>
            <button
              type="button"
              className={action === "HIDE" ? btnDanger : btnPrimary}
              disabled={submitting}
              onClick={submit}
            >
              {submitting ? t("admin.submitting") : t("admin.confirm")}
            </button>
          </>
        }
      >
        <p className="mb-4 text-[13px] text-[#b4b4b4]">
          {action === "HIDE" ? t("admin.hideWarning") : t("admin.restoreContentWarning")}
        </p>
        {selected ? (
          <div className="mb-4 border border-[#161616] p-3 text-[13px] text-[#b4b4b4]">
            <p className="text-white">
              {selected.type} #{selected.id} · {selected.authorNickname}
            </p>
            <p className="mt-1 line-clamp-3">{selected.preview}</p>
          </div>
        ) : null}
        <Field label={t("admin.table.reason")} htmlFor="content-action-reason">
          <select
            id="content-action-reason"
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
        <Field label={t("admin.note")} htmlFor="content-action-note">
          <textarea
            id="content-action-note"
            className={textareaClass}
            maxLength={1000}
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

export default Content;
