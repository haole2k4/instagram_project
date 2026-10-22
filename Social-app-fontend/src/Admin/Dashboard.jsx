import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { adminApi, errorMessage } from "./adminApi";
import {
  ErrorState,
  PageHeader,
  StatusDot,
  btnSecondary,
  formatDate,
} from "./AdminUI";

const Kpi = ({ label, value, note }) => (
  <div className="border border-[#161616] p-4">
    <p className="text-[12px] text-[#b4b4b4]">{label}</p>
    <p className="mt-2 text-[28px] font-semibold leading-8 tabular-nums text-white">
      {value}
    </p>
    {note ? <p className="mt-1 text-[12px] text-[#6f6f6f]">{note}</p> : null}
  </div>
);

const Dashboard = () => {
  const { t } = useTranslation();
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await adminApi.overview(days));
    } catch (requestError) {
      setError(errorMessage(requestError, t("admin.loadError")));
    } finally {
      setLoading(false);
    }
  }, [days, t]);

  useEffect(() => {
    load();
  }, [load]);

  const max = Math.max(
    1,
    ...(data?.processedByDay || []).map((day) => day.resolved + day.dismissed)
  );

  return (
    <div>
      <PageHeader
        title={t("admin.dashboard")}
        description={t("admin.dashboardDescription")}
        action={
          <div className="flex items-center gap-2">
            {[7, 30].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                className={
                  value === days
                    ? "h-9 rounded-[4px] bg-white px-3 text-[13px] font-medium text-black"
                    : btnSecondary
                }
              >
                {t("admin.lastDays", { days: value })}
              </button>
            ))}
          </div>
        }
      />

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 border border-[#161616]" />
          <div className="h-64 border border-[#161616]" />
        </div>
      ) : null}

      {!loading && !error && data ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi label={t("admin.kpi.totalUsers")} value={data.totalUsers} />
            <Kpi
              label={t("admin.kpi.newUsers")}
              value={data.newUsers}
              note={t("admin.lastDays", { days: days })}
            />
            <Kpi
              label={t("admin.kpi.newPosts")}
              value={data.newPosts}
              note={t("admin.lastDays", { days: days })}
            />
            <Kpi
              label={t("admin.kpi.openReports")}
              value={data.reports?.open ?? 0}
              note={t("admin.kpi.claimedReports", {
                count: data.reports?.claimed ?? 0,
              })}
            />
            <Kpi
              label={t("admin.kpi.avgResolution")}
              value={
                data.avgResolutionHours == null
                  ? "—"
                  : `${data.avgResolutionHours}h`
              }
              note={t("admin.kpi.avgResolutionNote")}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
            <section className="border border-[#161616]">
              <div className="flex items-center justify-between border-b border-[#161616] px-4 py-3">
                <h2 className="text-[16px] font-medium">
                  {t("admin.processedReports")}
                </h2>
                <div className="flex items-center gap-3 text-[11px] text-[#b4b4b4]">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 bg-[#0095f6]" /> {t("admin.resolved")}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 bg-[#2a2a2a]" /> {t("admin.dismissed")}
                  </span>
                </div>
              </div>
              {data.processedByDay?.length ? (
                <div className="flex h-64 items-end gap-1 px-4 pb-4 pt-6">
                  {data.processedByDay.map((day, index) => {
                    const total = day.resolved + day.dismissed;
                    const height = Math.max(4, (total / max) * 176);
                    const showLabel =
                      data.processedByDay.length <= 10 ||
                      index % Math.ceil(data.processedByDay.length / 7) === 0;
                    return (
                      <div
                        key={day.date}
                        className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                        title={`${day.date}: ${day.resolved} resolved, ${day.dismissed} dismissed`}
                      >
                        <div
                          className="flex w-full max-w-10 flex-col justify-end"
                          style={{ height: `${height}px` }}
                        >
                          {day.dismissed ? (
                            <div
                              className="w-full bg-[#2a2a2a]"
                              style={{
                                height: `${(day.dismissed / total) * 100}%`,
                              }}
                            />
                          ) : null}
                          {day.resolved ? (
                            <div
                              className="w-full bg-[#0095f6]"
                              style={{
                                height: `${(day.resolved / total) * 100}%`,
                              }}
                            />
                          ) : null}
                        </div>
                        {showLabel ? (
                          <span className="w-full truncate text-center text-[10px] text-[#6f6f6f]">
                            {day.date.slice(5)}
                          </span>
                        ) : (
                          <span className="h-3" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="px-4 py-10 text-[14px] text-[#b4b4b4]">
                  {t("admin.noProcessed")}
                </p>
              )}
            </section>

            <section className="border border-[#161616]">
              <div className="border-b border-[#161616] px-4 py-3">
                <h2 className="text-[16px] font-medium">
                  {t("admin.topReasons")}
                </h2>
              </div>
              {data.topReasons?.length ? (
                <ul>
                  {data.topReasons.map((reason) => (
                    <li
                      key={reason.reasonCode}
                      className="flex items-center justify-between border-b border-[#161616] px-4 py-3 text-[14px] last:border-0"
                    >
                      <span className="text-[#b4b4b4]">{reason.reasonCode}</span>
                      <span className="tabular-nums">{reason.total}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-10 text-[14px] text-[#b4b4b4]">
                  {t("admin.noReports")}
                </p>
              )}
            </section>
          </div>

          <div className="mt-6 border border-[#161616]">
            <div className="border-b border-[#161616] px-4 py-3">
              <h2 className="text-[16px] font-medium">
                {t("admin.reportQueue")}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[#161616] sm:grid-cols-4">
              {[
                ["OPEN", data.reports?.open],
                ["CLAIMED", data.reports?.claimed],
                ["RESOLVED", data.reports?.resolved],
                ["DISMISSED", data.reports?.dismissed],
              ].map(([status, value]) => (
                <div key={status} className="bg-black px-4 py-4">
                  <StatusDot status={status} />
                  <p className="mt-2 text-[24px] font-semibold tabular-nums">
                    {value ?? 0}
                  </p>
                  <p className="mt-1 text-[11px] text-[#6f6f6f]">
                    {t("admin.updatedAt")} {formatDate(new Date().toISOString())}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;
