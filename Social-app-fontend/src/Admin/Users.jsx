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
  btnSecondary,
  formatDate,
  inputClass,
  selectClass,
} from "./AdminUI";

const Users = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    q: "",
    status: "ALL",
    role: "ALL",
  });
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, size: 20 };
      if (filters.q) params.q = filters.q;
      if (filters.status !== "ALL") params.status = filters.status;
      if (filters.role !== "ALL") params.role = filters.role;
      setData(await adminApi.users(params));
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
        title={t("admin.users")}
        description={t("admin.usersDescription")}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            update("q", query.trim());
          }}
        >
          <div>
            <label className="mb-1 block text-[11px] text-[#6f6f6f]" htmlFor="user-search">
              {t("admin.search")}
            </label>
            <input
              id="user-search"
              className={inputClass + " !w-56"}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("admin.searchUsers")}
            />
          </div>
          <button type="submit" className={btnSecondary}>
            {t("admin.searchAction")}
          </button>
        </form>
        <div>
          <label className="mb-1 block text-[11px] text-[#6f6f6f]" htmlFor="user-status">
            {t("admin.filters.status")}
          </label>
          <select
            id="user-status"
            className={selectClass + " !w-40"}
            value={filters.status}
            onChange={(event) => update("status", event.target.value)}
          >
            {["ALL", "ACTIVE", "SUSPENDED", "BANNED"].map((status) => (
              <option key={status} value={status}>
                {status === "ALL" ? t("admin.all") : status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[#6f6f6f]" htmlFor="user-role">
            {t("admin.filters.role")}
          </label>
          <select
            id="user-role"
            className={selectClass + " !w-40"}
            value={filters.role}
            onChange={(event) => update("role", event.target.value)}
          >
            {["ALL", "USER", "MODERATOR", "ADMIN"].map((role) => (
              <option key={role} value={role}>
                {role === "ALL" ? t("admin.all") : role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <div className="overflow-x-auto border border-[#161616]">
        <table className="w-full min-w-[780px] border-collapse text-left">
          <thead className="sticky top-14 z-10 bg-black">
            <tr className="h-10 border-b border-[#161616] text-[11px] font-medium text-[#b4b4b4]">
              <th className="px-4">{t("admin.table.user")}</th>
              <th className="px-4">{t("admin.table.email")}</th>
              <th className="px-4">{t("admin.table.roles")}</th>
              <th className="px-4">{t("admin.table.status")}</th>
              <th className="px-4 text-right">{t("admin.table.posts")}</th>
              <th className="px-4 text-right">{t("admin.table.reports")}</th>
              <th className="px-4">{t("admin.table.joined")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRows rows={6} colSpan={7} /> : null}
            {!loading && !rows.length ? (
              <EmptyRow colSpan={7}>{t("admin.emptyUsers")}</EmptyRow>
            ) : null}
            {!loading
              ? rows.map((user) => (
                  <tr
                    key={user.id}
                    className="h-[52px] border-b border-[#161616] text-[14px] transition-colors duration-150 last:border-0 hover:bg-[#111]"
                  >
                    <td className="px-4">
                      <Link
                        to={`/admin/users/${user.id}`}
                        className="flex items-center gap-3 text-white hover:text-[#0095f6]"
                      >
                        {user.image ? (
                          <img
                            src={user.image}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#161616] text-[11px] text-[#b4b4b4]">
                            {(user.nickname || "?").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="max-w-[180px] truncate">
                          {user.nickname || "—"}
                        </span>
                      </Link>
                    </td>
                    <td className="max-w-[220px] truncate px-4 text-[#b4b4b4]">
                      {user.email || "—"}
                    </td>
                    <td className="px-4 text-[12px] text-[#b4b4b4]">
                      {user.roles?.join(" · ") || "—"}
                    </td>
                    <td className="px-4">
                      <StatusDot status={user.status} />
                    </td>
                    <td className="px-4 text-right tabular-nums">{user.postsCount}</td>
                    <td className="px-4 text-right tabular-nums">
                      {user.reportsCount}
                    </td>
                    <td className="whitespace-nowrap px-4 text-[#b4b4b4]">
                      {formatDate(user.createdAt)}
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

export default Users;
