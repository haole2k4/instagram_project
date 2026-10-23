import instance from "../Utils/AxiosApi/Axios";

const dataOf = (res) => (res && res.data !== undefined ? res.data : res);

export const adminApi = {
  overview: (days = 7) =>
    instance.get("/admin/stats/overview", { params: { days } }).then(dataOf),

  users: (params) => instance.get("/admin/users", { params }).then(dataOf),
  user: (id) => instance.get(`/admin/users/${id}`).then(dataOf),
  suspendUser: (id, body) =>
    instance.post(`/admin/users/${id}/suspend`, body).then(dataOf),
  banUser: (id, body) =>
    instance.post(`/admin/users/${id}/ban`, body).then(dataOf),
  restoreUser: (id, body) =>
    instance.post(`/admin/users/${id}/restore`, body).then(dataOf),

  reports: (params) => instance.get("/admin/reports", { params }).then(dataOf),
  report: (id) => instance.get(`/admin/reports/${id}`).then(dataOf),
  claimReport: (id) =>
    instance.post(`/admin/reports/${id}/claim`).then(dataOf),
  decideReport: (id, body) =>
    instance.post(`/admin/reports/${id}/decision`, body).then(dataOf),

  content: (params) =>
    instance.get("/admin/content", { params }).then(dataOf),
  moderateContent: (type, id, body) =>
    instance.post(`/admin/content/${type}/${id}/moderate`, body).then(dataOf),

  auditLogs: (params) =>
    instance.get("/admin/audit-logs", { params }).then(dataOf),
};

export const errorMessage = (error, fallback = "Không thể tải dữ liệu.") => {
  const body = error?.response?.data;
  return body?.message || body?.error || error?.message || fallback;
};
