import axios from "axios";
import store from "../../Redux/store";
import { userLoginData, userLogoutALL } from "../../Redux/Reducer/UserAppDeucer";

const instance = axios.create({
  baseURL: `${(process.env.REACT_APP_API_URL || "http://localhost:8081").replace(/\/+$/, "")}/api/v1`,
  withCredentials: true, // Cho phép gửi cookie với request
});

// Thêm interceptor để đính kèm token vào headers
instance.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.login?.accessToken;

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;   
    }
    return config;
  },
  (error) => Promise.reject(error)
);

instance.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const restrictedBody = error.response?.data;
    if (
      error.response?.status === 403 &&
      restrictedBody?.error === "ACCOUNT_RESTRICTED"
    ) {
      const state = store.getState().login;
      store.dispatch(
        userLoginData({
          user: state.userInfo,
          accessToken: state.accessToken,
          roles: state.roles,
          status: restrictedBody.data?.status || state.status,
          suspendedUntil: restrictedBody.data?.suspendedUntil || null,
        })
      );
    }
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axios.get(
          `${instance.defaults.baseURL}/auth/refresh`,
          { withCredentials: true }
        );
        const session =
          refreshResponse.data?.data ?? refreshResponse.data;
        if (session?.accessToken && session?.user) {
          store.dispatch(
            userLoginData({
              user: session.user,
              accessToken: session.accessToken,
              roles: session.roles,
              status: session.status,
              suspendedUntil: session.suspendedUntil,
            })
          );
        }
        return instance(originalRequest);
      } catch (err) {
        console.error("Refresh token failed, redirecting to login...");

        store.dispatch(userLogoutALL());
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
