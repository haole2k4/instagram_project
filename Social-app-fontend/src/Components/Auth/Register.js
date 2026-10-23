import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Instagram } from "lucide-react";
import { userRegister } from "../../Service/AuthApi";

const Register = () => {
  const navi = useNavigate();
  const { t } = useTranslation();

  const userSchema = yup.object().shape({
    email: yup
      .string()
      .email(t("auth.emailInvalid"))
      .required(t("auth.emailRequired")),
    password: yup
      .string()
      .min(8, t("auth.passwordMin"))
      .max(12, t("auth.passwordMax"))
      .required(t("auth.passwordRequired")),
    fullname: yup
      .string()
      .matches(/^[A-Za-zÀ-ỹ\s]+$/, t("auth.fullnameInvalid"))
      .required(t("auth.fullnameRequired")),
    username: yup
      .string()
      .matches(/^[a-zA-Z][a-zA-Z0-9_]{3,15}$/, t("auth.usernameInvalid"))
      .required(t("auth.usernameRequired")),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    resolver: yupResolver(userSchema),
  });

  const handleRegister = async (data) => {
    try {
      let res = await userRegister(data);
      if (res && res.statusCode === 201) {
        toast.success(t("auth.registerSuccess"));
        setTimeout(() => {
          navi("/login");
        }, 1500);
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
      <div className="w-full max-w-[384px] rounded-xl border border-ig-border bg-ig-surface p-8 text-center">
        <div className="mb-2 flex items-center justify-center gap-2.5">
          <Instagram size={24} strokeWidth={1.5} aria-hidden="true" />
          <h1 className="text-[20px] font-semibold tracking-[-0.02em]">
            Instagram
          </h1>
        </div>
        <p className="mb-6 text-[13px] text-ig-muted">
          {t("auth.registerSubtitle")}
        </p>

        <form
          className="space-y-3.5"
          onSubmit={handleSubmit(handleRegister)}
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

          <div>
            <input
              type="text"
              className="w-full rounded-lg border border-ig-border bg-ig-ground px-3.5 py-2.5 text-[16px] text-ig-text placeholder-ig-faint outline-none focus:border-ig-muted"
              placeholder={t("auth.fullname")}
              {...register("fullname")}
            />
            {errors.fullname && (
              <span className="mt-1 block text-left text-[12px] text-ig-like">
                {errors.fullname.message}
              </span>
            )}
          </div>

          <div>
            <input
              type="text"
              className="w-full rounded-lg border border-ig-border bg-ig-ground px-3.5 py-2.5 text-[16px] text-ig-text placeholder-ig-faint outline-none focus:border-ig-muted"
              placeholder={t("auth.username")}
              {...register("username")}
            />
            {errors.username && (
              <span className="mt-1 block text-left text-[12px] text-ig-like">
                {errors.username.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="ig-press w-full rounded-lg bg-ig-accent py-2.5 text-[14px] font-semibold text-white hover:opacity-90"
          >
            {t("auth.register")}
          </button>
        </form>
      </div>

      <div className="mt-3 w-full max-w-[384px] rounded-xl border border-ig-border bg-ig-surface p-4 text-center text-[14px] text-ig-muted">
        {t("auth.haveAccount")}{" "}
        <Link
          to="/login"
          className="font-semibold text-ig-accent hover:underline"
        >
          {t("auth.login")}
        </Link>
      </div>
    </div>
  );
};

export default Register;
