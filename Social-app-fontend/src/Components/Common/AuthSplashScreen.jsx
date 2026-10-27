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

export const BrandLogo = ({ className = "" }) => (
  <div className={`flex flex-col items-center select-none ${className}`}>
    <span className="text-[12px] text-[#737373] tracking-wide mb-0.5 font-normal">
      from
    </span>
    <span className="text-[14px] font-semibold text-white tracking-wide">
      haole2k4
    </span>
  </div>
);

export const MetaBrandLogo = BrandLogo;

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
