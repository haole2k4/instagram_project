import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Camera,
  ChevronLeft,
  Eye,
  EyeOff,
  Heart,
  MessageCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

import { userLogin } from "../../Service/authApi";
import { userLoginData } from "../../Redux/Reducer/UserAppDeucer";
import AuthSplashScreen, {
  BrandLogo,
  InstagramGradientGlyph,
} from "../Common/AuthSplashScreen";

const Login = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

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
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onChange",
    resolver: yupResolver(userSchema),
  });

  const handleSaveData = async (data) => {
    try {
      const res = await userLogin(data);
      if (res && res.data && res.statusCode === 200) {
        setIsLoggingIn(true);
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
        redirectTimerRef.current = setTimeout(() => {
          navigate(isStaff ? "/admin" : "/user/home");
        }, 900);
      }
    } catch (error) {
      setIsLoggingIn(false);
      if (error.response && error.response.data) {
        toast.error(error.response.data.error || t("auth.genericError"));
      } else {
        toast.error(t("auth.networkError"));
      }
    }
  };

  return (
    <>
      <AuthSplashScreen isVisible={isLoggingIn} />

      <div className="flex min-h-screen flex-col justify-between bg-ig-ground text-ig-text">
        <main className="flex flex-1 items-center justify-center px-4 py-8 md:px-8 lg:px-12">
          <div className="mx-auto grid w-full max-w-[1040px] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Editorial showcase (true-black, no gradients/emojis/blur) */}
            <div className="hidden flex-col items-start justify-center lg:flex">
              <div className="mb-6">
                <InstagramGradientGlyph size={44} />
              </div>

              <h1 className="mb-8 max-w-[440px] text-[24px] font-semibold leading-[1.3] tracking-tight text-ig-text">
                {t("auth.heroTitle")}
              </h1>

              <div className="w-full max-w-[360px] rounded-panel border border-ig-border bg-ig-surface p-5">
                <div className="mb-4 flex items-center justify-between border-b border-ig-rule pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ig-border bg-ig-ground text-ig-text">
                      <Camera size={16} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <span className="text-[14px] font-semibold text-ig-text">
                      {t("auth.showcaseLabel")}
                    </span>
                  </div>
                  <Heart size={16} strokeWidth={1.5} className="text-ig-like" aria-hidden="true" />
                </div>
                <div className="flex aspect-[4/3] items-center justify-center rounded-media border border-ig-border bg-ig-ground">
                  <div className="flex flex-col items-center gap-2 text-ig-muted">
                    <MessageCircle size={28} strokeWidth={1.5} aria-hidden="true" />
                    <span className="text-[13px]">{t("auth.showcaseCaption")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Form */}
            <div className="mx-auto w-full max-w-[390px] rounded-xl border border-ig-border bg-ig-surface p-8 lg:ml-auto">
              <div className="mb-4 flex items-center gap-2.5 lg:hidden">
                <InstagramGradientGlyph size={32} />
                <span className="text-[20px] font-semibold tracking-tight text-ig-text">
                  Instagram
                </span>
              </div>

              <div className="mb-6 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ig-muted hover:bg-ig-raised hover:text-ig-text"
                  aria-label={t("messenger.back")}
                >
                  <ChevronLeft size={20} strokeWidth={1.5} />
                </button>
                <h2 className="text-[20px] font-semibold tracking-tight text-ig-text">
                  {t("auth.loginTitle")}
                </h2>
              </div>

              <form
                className="space-y-3.5"
                onSubmit={handleSubmit(handleSaveData)}
                noValidate
              >
                <div>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-ig-border bg-ig-ground px-3.5 py-2.5 text-[14px] text-ig-text placeholder-ig-faint outline-none transition-colors focus:border-ig-accent"
                    placeholder={t("auth.email")}
                    aria-label={t("auth.email")}
                    {...register("email")}
                    autoComplete="username"
                  />
                  {errors.email && (
                    <span className="mt-1 block text-left text-[12px] text-ig-like">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-lg border border-ig-border bg-ig-ground px-3.5 py-2.5 pr-11 text-[14px] text-ig-text placeholder-ig-faint outline-none transition-colors focus:border-ig-accent"
                      placeholder={t("auth.password")}
                      aria-label={t("auth.password")}
                      {...register("password")}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ig-faint hover:text-ig-text"
                      aria-label={
                        showPassword
                          ? t("auth.hidePassword")
                          : t("auth.showPassword")
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={18} strokeWidth={1.5} />
                      ) : (
                        <Eye size={18} strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="mt-1 block text-left text-[12px] text-ig-like">
                      {errors.password.message}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isLoggingIn}
                  className="ig-press mt-2 w-full rounded-lg bg-ig-accent py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting || isLoggingIn
                    ? t("common.submitting")
                    : t("auth.login")}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => toast.info(t("auth.forgotPasswordInfo"))}
                    className="text-[13px] text-ig-muted hover:text-ig-text hover:underline"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>

                <div className="pt-4">
                  <Link
                    to="/register"
                    className="ig-press block w-full rounded-lg border border-ig-accent py-2.5 text-center text-[14px] font-semibold text-ig-accent hover:bg-ig-accent/10"
                  >
                    {t("auth.createAccount")}
                  </Link>
                </div>
              </form>

              <div className="mt-8 flex justify-center">
                <BrandLogo />
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Login;
