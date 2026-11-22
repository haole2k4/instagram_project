import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { adminApi, errorMessage } from "./adminApi";
import {
  EmptyRow,
  ErrorState,
  LoadingRows,
  Pagination,
  PageHeader,
  REASONS,
  StatusDot,
  formatDate,
  formatReportAge,
  selectClass,
  shorten,
} from "./AdminUI";

const Reports = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    status: "OPEN",
    targetType: "ALL",
    reasonCode: "ALL",
    assignee: "ALL",
  });
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        status: filters.status,
        targetType: filters.targetType,
        page,
        size: 20,
      };
      if (filters.reasonCode !== "ALL") params.reasonCode = filters.reasonCode;
      if (filters.assignee !== "ALL") params.assignee = filters.assignee;
      setData(await adminApi.reports(params));
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
        title={t("admin.reports")}
        description={t("admin.reportsDescription")}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[11px] text-ig-faint" htmlFor="report-status">
            {t("admin.filters.status")}
          </label>
          <select
            id="report-status"
            className={selectClass + " !w-40"}
            value={filters.status}
            onChange={(event) => update("status", event.target.value)}
          >
            {["OPEN", "CLAIMED", "RESOLVED", "DISMISSED", "ALL"].map((status) => (
              <option key={status} value={status}>
                {status === "ALL" ? t("admin.all") : status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-ig-faint" htmlFor="report-target">
            {t("admin.filters.targetType")}
          </label>
          <select
            id="report-target"
            className={selectClass + " !w-40"}
            value={filters.targetType}
            onChange={(event) => update("targetType", event.target.value)}
          >
            {["ALL", "POST", "COMMENT", "USER"].map((type) => (
              <option key={type} value={type}>
                {type === "ALL" ? t("admin.all") : type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-ig-faint" htmlFor="report-reason">
            {t("admin.filters.reasonCode")}
          </label>
          <select
            id="report-reason"
            className={selectClass + " !w-44"}
            value={filters.reasonCode}
            onChange={(event) => update("reasonCode", event.target.value)}
          >
            <option value="ALL">{t("admin.all")}</option>
            {REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-ig-faint" htmlFor="report-assignee">
            {t("admin.filters.assignee")}
          </label>
          <select
            id="report-assignee"
            className={selectClass + " !w-40"}
            value={filters.assignee}
            onChange={(event) => update("assignee", event.target.value)}
          >
            <option value="ALL">{t("admin.all")}</option>
            <option value="me">{t("admin.filters.assignedToMe")}</option>
            <option value="unassigned">{t("admin.unassigned")}</option>
          </select>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <div className="overflow-x-auto border border-[#161616]">
        <table className="w-full min-w-[840px] border-collapse text-left">
          <thead className="sticky top-14 z-10 bg-black">
            <tr className="h-10 border-b border-[#161616] text-[11px] font-medium text-[#b4b4b4]">
              <th className="px-4">ID</th>
              <th className="px-4">{t("admin.table.target")}</th>
              <th className="px-4">{t("admin.table.reason")}</th>
              <th className="px-4">{t("admin.table.reporter")}</th>
              <th className="px-4">{t("admin.table.age")}</th>
              <th className="px-4">{t("admin.table.assignee")}</th>
              <th className="px-4">{t("admin.table.status")}</th>
              <th className="px-4">{t("admin.table.createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRows rows={6} colSpan={8} /> : null}
            {!loading && !rows.length ? (
              <EmptyRow colSpan={8}>{t("admin.emptyReports")}</EmptyRow>
            ) : null}
            {!loading
              ? rows.map((report) => (
                  <tr
                    key={report.id}
                    className="h-[52px] border-b border-[#161616] text-[14px] transition-colors duration-150 last:border-0 hover:bg-[#111]"
                  >
                    <td className="px-4 tabular-nums text-[#b4b4b4]">
                      #{report.id}
                    </td>
                    <td className="px-4">
                      <Link
                        to={`/admin/reports/${report.id}`}
                        className="block max-w-[280px] truncate text-white hover:text-[#0095f6]"
                        title={report.targetPreview || ""}
                      >
                        <span className="mr-2 text-[11px] text-ig-faint">
                          {report.targetType}
                        </span>
                        {shorten(report.targetPreview, 60) || "—"}
                      </Link>
                    </td>
                    <td className="px-4 text-[#b4b4b4]">{report.reasonCode}</td>
                    <td className="px-4 text-[#b4b4b4]">
                      {report.reporterNickname || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 tabular-nums text-[#b4b4b4]">
                      {formatReportAge(report.createdAt, t)}
                    </td>
                    <td className="px-4 text-[#b4b4b4]">
                      {report.assigneeNickname || "—"}
                    </td>
                    <td className="px-4">
                      <StatusDot status={report.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 text-[#b4b4b4]">
                      {formatDate(report.createdAt)}
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

export default Reports;
