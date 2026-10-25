import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { ChevronLeft, Eye, EyeOff, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

import { userLogin } from "../../Service/AuthApi";
import { userLoginData } from "../../Redux/Reducer/UserAppDeucer";
import AuthSplashScreen, {
  InstagramGradientGlyph,
  MetaBrandLogo,
} from "../Common/AuthSplashScreen";

const Login = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
        setTimeout(() => {
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

      <div className="flex min-h-screen flex-col justify-between bg-black text-white selection:bg-[#0095f6]/30">
        <main className="flex flex-1 items-center justify-center px-4 py-8 md:px-8 lg:px-12">
          <div className="mx-auto grid w-full max-w-[1080px] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Cột trái: Slogan & Mockup Stories */}
            <div className="hidden flex-col items-start justify-center lg:flex">
              <div className="mb-6">
                <InstagramGradientGlyph size={48} />
              </div>

              <h1 className="mb-10 max-w-[460px] text-[36px] font-bold leading-[1.15] tracking-tight text-white xl:text-[44px]">
                See everyday moments from your close friends.
              </h1>

              {/* Visual Mockup Cards */}
              <div className="relative mt-2 flex h-[390px] w-full max-w-[460px] items-center justify-center select-none">
                {/* Background Card Left */}
                <div
                  className="absolute left-4 top-12 h-[290px] w-[190px] -rotate-12 rounded-[24px] border border-white/10 bg-[#161616] p-1.5 opacity-40 shadow-xl"
                  aria-hidden="true"
                >
                  <div className="h-full w-full rounded-[20px] bg-gradient-to-tr from-[#1a382b] via-[#204a3e] to-[#2ecc71] opacity-60" />
                </div>

                {/* Background Card Right */}
                <div
                  className="absolute right-4 top-10 h-[300px] w-[200px] rotate-12 rounded-[24px] border border-white/10 bg-[#161616] p-1.5 opacity-45 shadow-xl"
                  aria-hidden="true"
                >
                  <div className="h-full w-full rounded-[20px] bg-gradient-to-tr from-[#3a1c28] via-[#7b1fa2] to-[#ff4081] opacity-60" />
                </div>

                {/* Main Foreground Card */}
                <div className="relative z-10 flex h-[350px] w-[230px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/15 bg-[#121212] p-2.5 shadow-2xl">
                  {/* Photo Simulation */}
                  <div className="relative flex-1 overflow-hidden rounded-[22px] bg-gradient-to-b from-[#2d2217] via-[#5c3a21] to-[#1a1410]">
                    {/* Top Bars */}
                    <div className="absolute left-2.5 right-2.5 top-2.5 flex gap-1">
                      <div className="h-0.5 flex-1 rounded-full bg-white/80" />
                      <div className="h-0.5 flex-1 rounded-full bg-white/30" />
                    </div>

                    {/* Floating Reaction Pill */}
                    <div className="absolute left-3 top-6 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[14px] shadow-lg backdrop-blur-md">
                      <span>👀</span>
                      <span>🤯</span>
                    </div>

                    {/* Close Friends Star Badge */}
                    <div className="absolute right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full bg-[#00ba38] text-[13px] font-black text-black shadow-lg">
                      ★
                    </div>

                    {/* Close Friend Portrait Graphic */}
                    <div className="flex h-full w-full flex-col items-center justify-center pt-8 text-center">
                      <div className="relative mb-2 h-24 w-24 rounded-full border-2 border-white/30 p-1">
                        <div className="h-full w-full rounded-full bg-gradient-to-tr from-[#f09433] to-[#bc1888] flex items-center justify-center text-[28px]">
                          ✌️
                        </div>
                      </div>
                      <span className="text-[12px] font-semibold text-white/90">
                        @close_friends
                      </span>
                    </div>

                    {/* Floating Heart Icon Left Bottom */}
                    <div className="absolute bottom-10 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-lg">
                      <Heart size={16} fill="currentColor" strokeWidth={0} />
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      <div className="h-6 flex-1 rounded-full border border-white/30 bg-black/40 px-3" />
                      <div className="ml-2 text-white/80">
                        <Heart size={18} strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Form Đăng nhập phong cách Instagram */}
            <div className="mx-auto w-full max-w-[390px] lg:ml-auto">
              <div className="mb-4 flex items-center gap-2 lg:hidden">
                <InstagramGradientGlyph size={36} />
                <span className="text-[20px] font-bold">Instagram</span>
              </div>

              <div className="mb-6 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-[#1a1a1a] hover:text-white"
                  aria-label="Back"
                >
                  <ChevronLeft size={20} strokeWidth={1.5} />
                </button>
                <h2 className="text-[18px] font-semibold tracking-tight text-white sm:text-[20px]">
                  {t("auth.loginTitle") || "Log into Instagram"}
                </h2>
              </div>

              <form
                className="space-y-3"
                onSubmit={handleSubmit(handleSaveData)}
                noValidate
              >
                <div>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-[#262626] bg-[#121212] px-4 py-3.5 text-[14px] text-white placeholder-[#737373] outline-none transition-colors focus:border-[#0095f6]"
                    placeholder="Mobile number, username or email"
                    {...register("email")}
                    autoComplete="username"
                  />
                  {errors.email && (
                    <span className="mt-1 block text-left text-[12px] text-ig-like">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-[#262626] bg-[#121212] px-4 py-3.5 pr-11 text-[14px] text-white placeholder-[#737373] outline-none transition-colors focus:border-[#0095f6]"
                    placeholder="Password"
                    {...register("password")}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff size={18} strokeWidth={1.5} />
                    ) : (
                      <Eye size={18} strokeWidth={1.5} />
                    )}
                  </button>
                  {errors.password && (
                    <span className="mt-1 block text-left text-[12px] text-ig-like">
                      {errors.password.message}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isLoggingIn}
                  className="ig-press mt-2 w-full rounded-xl bg-[#0095f6] py-3 text-[14px] font-semibold text-white transition hover:bg-[#1877f2] disabled:opacity-50"
                >
                  {isSubmitting || isLoggingIn
                    ? t("common.submitting") || "Logging in..."
                    : "Log in"}
                </button>

                <div className="pt-2 text-center">
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info("Vui lòng liên hệ quản trị viên để khôi phục mật khẩu.");
                    }}
                    className="text-[13px] text-neutral-300 hover:text-white hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-[1px] flex-1 bg-[#262626]" />
                  <span className="text-[12px] font-semibold text-[#737373]">
                    OR
                  </span>
                  <div className="h-[1px] flex-1 bg-[#262626]" />
                </div>

                {/* Facebook Login */}
                <button
                  type="button"
                  onClick={() => toast.info("Tính năng đăng nhập Facebook đang thử nghiệm.")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-semibold text-[#1877f2] hover:text-[#385898] transition"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  <span>Log in with Facebook</span>
                </button>

                {/* Create Account Outline Button */}
                <div className="pt-3">
                  <Link
                    to="/register"
                    className="ig-press block w-full rounded-xl border border-[#0095f6] py-2.5 text-center text-[14px] font-semibold text-[#0095f6] hover:bg-[#0095f6]/10"
                  >
                    Create new account
                  </Link>
                </div>
              </form>

              {/* Meta Branding */}
              <div className="mt-8 flex justify-center">
                <MetaBrandLogo />
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#1a1a1a] px-4 py-6 text-center text-[12px] text-[#737373]">
          <nav className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
            {[
              "Meta",
              "About",
              "Blog",
              "Jobs",
              "Help",
              "API",
              "Privacy",
              "Terms",
              "Locations",
              "Instagram Lite",
              "Threads",
              "Contact Uploading & Non-Users",
              "Meta Verified",
            ].map((link) => (
              <span
                key={link}
                className="cursor-pointer transition-colors hover:text-neutral-400"
              >
                {link}
              </span>
            ))}
          </nav>
          <div className="flex items-center justify-center gap-4">
            <span className="cursor-pointer hover:text-neutral-400">
              English ⌵
            </span>
            <span>© 2026 Instagram from Meta</span>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Login;
