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
  StatusDot,
  formatDate,
  selectClass,
  shorten,
} from "./AdminUI";

const Reports = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    status: "OPEN",
    targetType: "ALL",
  });
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(
        await adminApi.reports({
          status: filters.status,
          targetType: filters.targetType,
          page,
          size: 20,
        })
      );
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
          <label className="mb-1 block text-[11px] text-[#6f6f6f]" htmlFor="report-status">
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
          <label className="mb-1 block text-[11px] text-[#6f6f6f]" htmlFor="report-target">
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
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <div className="overflow-x-auto border border-[#161616]">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="sticky top-14 z-10 bg-black">
            <tr className="h-10 border-b border-[#161616] text-[11px] font-medium text-[#b4b4b4]">
              <th className="px-4">ID</th>
              <th className="px-4">{t("admin.table.target")}</th>
              <th className="px-4">{t("admin.table.reason")}</th>
              <th className="px-4">{t("admin.table.reporter")}</th>
              <th className="px-4">{t("admin.table.assignee")}</th>
              <th className="px-4">{t("admin.table.status")}</th>
              <th className="px-4">{t("admin.table.createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRows rows={6} colSpan={7} /> : null}
            {!loading && !rows.length ? (
              <EmptyRow colSpan={7}>{t("admin.emptyReports")}</EmptyRow>
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
                        <span className="mr-2 text-[11px] text-[#6f6f6f]">
                          {report.targetType}
                        </span>
                        {shorten(report.targetPreview, 60) || "—"}
                      </Link>
                    </td>
                    <td className="px-4 text-[#b4b4b4]">{report.reasonCode}</td>
                    <td className="px-4 text-[#b4b4b4]">
                      {report.reporterNickname || "—"}
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
