import axios from "axios";
import store from "../../Redux/store";
import { userLoginData, userLogoutALL } from "../../Redux/Reducer/UserAppDeucer";
import instance from "./Axios";

describe("Axios interceptor", () => {
  const originalAdapter = instance.defaults.adapter;

  beforeEach(() => {
    store.dispatch(
      userLoginData({
        user: { id: 1, userNickname: "alice" },
        accessToken: "expired-token",
        roles: ["USER"],
      })
    );
  });

  afterEach(() => {
    instance.defaults.adapter = originalAdapter;
    jest.restoreAllMocks();
    store.dispatch(userLogoutALL());
  });

  test("shares a single GET /auth/refresh call across parallel 401 responses", async () => {
    let resolveRefresh;
    const refreshSpy = jest.spyOn(axios, "get").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        })
    );

    const adapterSpy = jest.fn(async (config) => {
      if (config.headers?.Authorization === "Bearer expired-token") {
        const err = new Error("Unauthorized");
        err.config = config;
        err.response = { status: 401, data: {} };
        throw err;
      }
      return {
        data: { statusCode: 200, data: { ok: true, url: config.url } },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    });
    instance.defaults.adapter = adapterSpy;

    const p1 = instance.get("/posts");
    const p2 = instance.get("/user/1");

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/auth\/refresh$/),
      { withCredentials: true }
    );

    resolveRefresh({
      data: {
        data: {
          user: { id: 1, userNickname: "alice" },
          accessToken: "fresh-token",
          roles: ["USER"],
        },
      },
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.data.ok).toBe(true);
    expect(r2.data.ok).toBe(true);
    expect(store.getState().login.accessToken).toBe("fresh-token");
  });

  test.each(["/auth/login", "/auth/register", "/auth/refresh"])(
    "skips refresh when 401 comes from %s",
    async (authUrl) => {
      const refreshSpy = jest.spyOn(axios, "get");
      instance.defaults.adapter = jest.fn(async (config) => {
        const err = new Error("Unauthorized");
        err.config = config;
        err.response = { status: 401, data: {} };
        throw err;
      });

      await expect(instance.post(authUrl, {})).rejects.toThrow("Unauthorized");
      expect(refreshSpy).not.toHaveBeenCalled();
    }
  );

  test("dispatches userLogoutALL and rejects when refresh response lacks accessToken or user", async () => {
    jest.spyOn(axios, "get").mockResolvedValue({
      data: { data: { accessToken: "" } },
    });

    const adapterSpy = jest.fn(async (config) => {
      const err = new Error("Unauthorized");
      err.config = config;
      err.response = { status: 401, data: {} };
      throw err;
    });
    instance.defaults.adapter = adapterSpy;

    await expect(instance.get("/posts")).rejects.toThrow("Unauthorized");
    expect(adapterSpy).toHaveBeenCalledTimes(1);
    expect(store.getState().login.isLoggedIn).toBe(false);
    expect(store.getState().login.accessToken).toBe("");
  });
});
