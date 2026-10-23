import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { adminApi, errorMessage } from "./adminApi";
import {
  EmptyRow,
  ErrorState,
  LoadingRows,
  Pagination,
  PageHeader,
  btnSecondary,
  formatDate,
  inputClass,
  selectClass,
} from "./AdminUI";

const AuditLogs = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    action: "",
    targetType: "ALL",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, size: 30 };
      if (filters.action) params.action = filters.action.trim();
      if (filters.targetType !== "ALL") params.targetType = filters.targetType;
      if (filters.from) params.from = new Date(filters.from).toISOString();
      if (filters.to) params.to = new Date(filters.to).toISOString();
      setData(await adminApi.auditLogs(params));
    } catch (requestError) {
      setError(errorMessage(requestError, t("admin.loadError")));
    } finally {
      setLoading(false);
    }
  }, [filters, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (key, value) => {
    setPage(0);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const rows = data?.content || [];

  return (
    <div>
      <PageHeader
        title={t("admin.audit")}
        description={t("admin.auditDescription")}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[11px] text-[#6f6f6f]" htmlFor="audit-action">
            {t("admin.table.action")}
          </label>
          <input
            id="audit-action"
            className={inputClass + " !w-52"}
            value={filters.action}
            onChange={(event) => update("action", event.target.value)}
            placeholder="USER_BAN, REPORT_DECIDE…"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[#6f6f6f]" htmlFor="audit-target">
            {t("admin.filters.targetType")}
          </label>
          <select
            id="audit-target"
            className={selectClass + " !w-40"}
            value={filters.targetType}
            onChange={(event) => update("targetType", event.target.value)}
          >
            {["ALL", "USER", "POST", "COMMENT", "STORY", "REPORT"].map((type) => (
              <option key={type} value={type}>
                {type === "ALL" ? t("admin.all") : type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[#6f6f6f]" htmlFor="audit-from">
            {t("admin.filters.from")}
          </label>
          <input
            id="audit-from"
            type="datetime-local"
            className={inputClass + " !w-52"}
            value={filters.from}
            onChange={(event) => update("from", event.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[#6f6f6f]" htmlFor="audit-to">
            {t("admin.filters.to")}
          </label>
          <input
            id="audit-to"
            type="datetime-local"
            className={inputClass + " !w-52"}
            value={filters.to}
            onChange={(event) => update("to", event.target.value)}
          />
        </div>
        <button type="button" className={btnSecondary} onClick={load}>
          {t("admin.apply")}
        </button>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <div className="overflow-x-auto border border-[#161616]">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="sticky top-14 z-10 bg-black">
            <tr className="h-10 border-b border-[#161616] text-[11px] font-medium text-[#b4b4b4]">
              <th className="px-4">{t("admin.table.actor")}</th>
              <th className="px-4">{t("admin.table.action")}</th>
              <th className="px-4">{t("admin.table.target")}</th>
              <th className="px-4">{t("admin.table.reason")}</th>
              <th className="px-4">{t("admin.table.metadata")}</th>
              <th className="px-4">{t("admin.table.createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRows rows={8} colSpan={6} /> : null}
            {!loading && !rows.length ? (
              <EmptyRow colSpan={6}>{t("admin.emptyAudit")}</EmptyRow>
            ) : null}
            {!loading
              ? rows.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[#161616] align-top text-[13px] transition-colors duration-150 last:border-0 hover:bg-[#111]"
                  >
                    <td className="px-4 py-3">
                      <p className="text-white">{log.actorLabel || "—"}</p>
                      <p className="text-[11px] text-[#6f6f6f]">#{log.actorId}</p>
                    </td>
                    <td className="px-4 py-3 text-[#b4b4b4]">{log.action}</td>
                    <td className="px-4 py-3 text-[#b4b4b4]">
                      {log.targetType} #{log.targetId}
                      {log.reportId ? (
                        <p className="text-[11px] text-[#6f6f6f]">
                          report #{log.reportId}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[#b4b4b4]">{log.reasonCode || "—"}</p>
                      {log.reasonText ? (
                        <p className="mt-1 max-w-[220px] text-[11px] text-[#6f6f6f]">
                          {log.reasonText}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[#b4b4b4]">
                      {log.metadata ? (
                        <details>
                          <summary className="cursor-pointer text-[12px] text-[#6f6f6f]">
                            {t("admin.viewMetadata")}
                          </summary>
                          <pre className="mt-1 max-w-[240px] overflow-x-auto whitespace-pre-wrap break-all text-[11px] text-[#6f6f6f]">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#b4b4b4]">
                      {formatDate(log.createdAt)}
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
    </div>
  );
};

export default AuditLogs;
