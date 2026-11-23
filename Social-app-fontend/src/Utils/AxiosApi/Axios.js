import axios from "axios";
import { userLoginData, userLogoutALL } from "../../Redux/Reducer/UserAppDeucer";

let injectedStore = null;

export const injectAxiosStore = (storeInstance) => {
  injectedStore = storeInstance;
};

const instance = axios.create({
  baseURL: `${(process.env.REACT_APP_API_URL || "http://localhost:8081").replace(/\/+$/, "")}/api/v1`,
  withCredentials: true, // Cho phép gửi cookie với request
});

// Thêm interceptor để đính kèm token vào headers
instance.interceptors.request.use(
  (config) => {
    const state = injectedStore?.getState?.();
    const token = state?.login?.accessToken;

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshPromise = null;

const isAuthEndpoint = (url = "") =>
  url.includes("/auth/login") ||
  url.includes("/auth/register") ||
  url.includes("/auth/refresh");

instance.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const restrictedBody = error.response?.data;
    if (
      error.response?.status === 403 &&
      restrictedBody?.error === "ACCOUNT_RESTRICTED"
    ) {
      const state = injectedStore?.getState?.()?.login || {};
      injectedStore?.dispatch?.(
        userLoginData({
          user: state.userInfo,
          accessToken: state.accessToken,
          roles: state.roles,
          status: restrictedBody.data?.status || state.status,
          suspendedUntil: restrictedBody.data?.suspendedUntil || null,
        })
      );
    }
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .get(`${instance.defaults.baseURL}/auth/refresh`, {
              withCredentials: true,
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const refreshResponse = await refreshPromise;
        const session =
          refreshResponse.data?.data ?? refreshResponse.data;
        if (!session?.accessToken || !session?.user) {
          injectedStore?.dispatch?.(userLogoutALL());
          if (typeof window !== "undefined" && window.location) {
            window.location.href = "/login";
          }
          return Promise.reject(error);
        }
        injectedStore?.dispatch?.(
          userLoginData({
            user: session.user,
            accessToken: session.accessToken,
            roles: session.roles,
            status: session.status,
            suspendedUntil: session.suspendedUntil,
          })
        );
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers["Authorization"] = `Bearer ${session.accessToken}`;
        return instance(originalRequest);
      } catch (err) {
        console.error("Refresh token failed, redirecting to login...");
        injectedStore?.dispatch?.(userLogoutALL());
        if (typeof window !== "undefined" && window.location) {
          window.location.href = "/login";
        }
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
