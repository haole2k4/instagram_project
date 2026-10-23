import React from "react";

const TextEllipse = ({ username = "", maxLength = 10, viewed = false }) => {
  const safeName = String(username || "");
  const usernameEllipse =
    safeName.length > maxLength
      ? `${safeName.slice(0, maxLength)}…`
      : safeName;

  return (
    <p
      className={`mt-1.5 max-w-[68px] truncate text-center text-[12px] leading-tight ${
        viewed ? "text-ig-muted" : "text-ig-text"
      }`}
    >
      {usernameEllipse}
    </p>
  );
};

export default TextEllipse;
