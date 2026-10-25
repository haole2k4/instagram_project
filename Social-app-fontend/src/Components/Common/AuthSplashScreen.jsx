import React from "react";

export const InstagramGradientGlyph = ({ size = 72, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="igGlyphGrad" x1="0.1" y1="0.9" x2="0.9" y2="0.1">
        <stop offset="0%" stopColor="#f09433" />
        <stop offset="30%" stopColor="#e6683c" />
        <stop offset="60%" stopColor="#dc2743" />
        <stop offset="85%" stopColor="#cc2366" />
        <stop offset="100%" stopColor="#bc1888" />
      </linearGradient>
    </defs>
    <rect
      x="5"
      y="5"
      width="70"
      height="70"
      rx="22"
      stroke="url(#igGlyphGrad)"
      strokeWidth="7"
    />
    <circle
      cx="40"
      cy="40"
      r="16.5"
      stroke="url(#igGlyphGrad)"
      strokeWidth="7"
    />
    <circle
      cx="57.5"
      cy="22.5"
      r="4.5"
      fill="url(#igGlyphGrad)"
    />
  </svg>
);

export const MetaBrandLogo = ({ className = "" }) => (
  <div className={`flex flex-col items-center select-none ${className}`}>
    <span className="text-[12px] text-[#737373] tracking-wide mb-1 font-normal">
      from
    </span>
    <div className="flex items-center gap-1.5">
      <svg
        width="24"
        height="16"
        viewBox="0 0 24 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="inline-block shrink-0"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="metaGrad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#0064e0" />
            <stop offset="50%" stopColor="#fa3e3e" />
            <stop offset="100%" stopColor="#ff7a00" />
          </linearGradient>
        </defs>
        <path
          d="M16.65 1.5C14.7 1.5 13.04 2.58 12 4.14C10.96 2.58 9.3 1.5 7.35 1.5C3.84 1.5 1 4.41 1 8C1 11.59 3.84 14.5 7.35 14.5C9.3 14.5 10.96 13.42 12 11.86C13.04 13.42 14.7 14.5 16.65 14.5C20.16 14.5 23 11.59 23 8C23 4.41 20.16 1.5 16.65 1.5ZM7.35 12C5.22 12 3.5 10.21 3.5 8C3.5 5.79 5.22 4 7.35 4C9.28 4 10.66 5.56 11.33 7.02C10.82 8.12 10.02 9.25 9.07 10.33C8.48 11.39 7.9 12 7.35 12ZM16.65 12C16.1 12 15.52 11.39 14.93 10.33C13.98 9.25 13.18 8.12 12.67 7.02C13.34 5.56 14.72 4 16.65 4C18.78 4 20.5 5.79 20.5 8C20.5 10.21 18.78 12 16.65 12Z"
          fill="url(#metaGrad)"
        />
      </svg>
      <span className="text-[14px] font-semibold text-white tracking-tight">
        Meta
      </span>
    </div>
  </div>
);

const AuthSplashScreen = ({ isVisible = true }) => {
  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-label="Loading Instagram"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-black px-6 py-12 transition-opacity duration-300"
    >
      <div className="h-6" aria-hidden="true" />
      <div className="flex flex-col items-center justify-center animate-pulse">
        <InstagramGradientGlyph size={76} />
      </div>
      <div className="pb-6">
        <MetaBrandLogo />
      </div>
    </div>
  );
};

export default AuthSplashScreen;
