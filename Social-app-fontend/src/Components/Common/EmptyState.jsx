import React from "react";

const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}
    >
      {Icon && (
        <div className="mb-3 text-ig-muted">
          <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
      {title && (
        <p className="text-[16px] font-medium text-ig-text">{title}</p>
      )}
      {description && (
        <p className="mt-1 max-w-sm text-[14px] text-ig-muted">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="ig-press mt-4 rounded-control bg-ig-accent px-5 py-2 text-[14px] font-semibold text-ig-text hover:opacity-90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
