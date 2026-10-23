import { yupResolver } from "@hookform/resolvers/yup";
import React from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import * as yup from "yup";
import { Instagram } from "lucide-react";
import { userLogin } from "../../Service/AuthApi";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { userLoginData } from "../../Redux/Reducer/UserAppDeucer";

const Login = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const usenavi = useNavigate();

  const userSchema = yup.object().shape({
    email: yup
      .string()
      .email(t("auth.emailInvalid"))
      .required(t("auth.emailRequired")),
    password: yup
      .string()
      .min(8, t("auth.passwordMin"))
      .required(t("auth.passwordRequired")),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    resolver: yupResolver(userSchema),
  });

  const handleSaveData = async (data) => {
    try {
      let res = await userLogin(data);
      if (res && res.data && res.statusCode === 200) {
        toast.success(t("auth.loginSuccess"));
        dispatch(
          userLoginData({
            user: res.data.user,
            accessToken: res.data.accessToken,
            roles: res.data.roles,
            status: res.data.status,
            suspendedUntil: res.data.suspendedUntil,
          })
        );

        const isStaff =
          res.data.roles?.includes("ADMIN") ||
          res.data.roles?.includes("MODERATOR");
        setTimeout(() => {
          usenavi(isStaff ? "/admin" : "/user/home");
        }, 800);
      }
    } catch (error) {
      if (error.response && error.response.data) {
        toast.error(error.response.data.error || t("auth.genericError"));
      } else {
        toast.error(t("auth.networkError"));
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ig-ground px-4 text-ig-text">
      <div className="w-full max-w-[384px] rounded-xl border border-ig-border bg-ig-surface p-8">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <Instagram size={24} strokeWidth={1.5} aria-hidden="true" />
          <h1 className="text-[20px] font-semibold tracking-[-0.02em]">
            Instagram
          </h1>
        </div>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(handleSaveData)}
          noValidate
        >
          <div>
            <input
              type="email"
              className="w-full rounded-lg border border-ig-border bg-ig-ground px-3.5 py-2.5 text-[16px] text-ig-text placeholder-ig-faint outline-none focus:border-ig-muted"
              placeholder={t("auth.email")}
              {...register("email")}
            />
            {errors.email && (
              <span className="mt-1 block text-left text-[12px] text-ig-like">
                {errors.email.message}
              </span>
            )}
          </div>
          <div>
            <input
              type="password"
              className="w-full rounded-lg border border-ig-border bg-ig-ground px-3.5 py-2.5 text-[16px] text-ig-text placeholder-ig-faint outline-none focus:border-ig-muted"
              placeholder={t("auth.password")}
              {...register("password")}
            />
            {errors.password && (
              <span className="mt-1 block text-left text-[12px] text-ig-like">
                {errors.password.message}
              </span>
            )}
          </div>
          <button
            className="ig-press w-full rounded-lg bg-ig-accent py-2.5 text-[14px] font-semibold text-white hover:opacity-90"
            type="submit"
          >
            {t("auth.login")}
          </button>
        </form>
      </div>

      <div className="mt-3 w-full max-w-[384px] rounded-xl border border-ig-border bg-ig-surface p-4 text-center text-[14px] text-ig-muted">
        {t("auth.noAccount")}{" "}
        <Link
          to="/register"
          className="font-semibold text-ig-accent hover:underline"
        >
          {t("auth.register")}
        </Link>
      </div>
    </div>
  );
};

export default Login;
