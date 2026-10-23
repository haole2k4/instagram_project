import React from "react";

export const FlatBar = ({ className = "h-3 w-24" }) => (
  <div
    aria-hidden="true"
    className={`rounded-media bg-ig-rule ${className}`}
  />
);

export const StoryBarSkeleton = ({ count = 6 }) => (
  <div
    role="status"
    aria-busy="true"
    className="flex w-full items-center gap-4 overflow-hidden py-3"
  >
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="flex shrink-0 flex-col items-center gap-1.5">
        <div className="h-16 w-16 rounded-full bg-ig-surface border border-ig-border" />
        <div className="h-2.5 w-12 rounded-media bg-ig-rule" />
      </div>
    ))}
  </div>
);

export const PostCardSkeleton = () => (
  <div
    role="status"
    aria-busy="true"
    className="mx-auto w-full max-w-[470px] border-b border-ig-rule pb-6 mb-6"
  >
    <div className="flex items-center gap-3 py-3">
      <div className="h-9 w-9 shrink-0 rounded-full bg-ig-surface" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="h-3.5 w-28 rounded-media bg-ig-rule" />
        <div className="h-2.5 w-16 rounded-media bg-ig-surface" />
      </div>
    </div>
    <div className="aspect-[4/5] w-full rounded-media bg-ig-surface border border-ig-rule" />
    <div className="mt-3 flex flex-col gap-2">
      <div className="h-3.5 w-24 rounded-media bg-ig-rule" />
      <div className="h-3.5 w-3/4 rounded-media bg-ig-surface" />
    </div>
  </div>
);

export const RowListSkeleton = ({ count = 5, rowHeight = "h-16" }) => (
  <div role="status" aria-busy="true" className="flex flex-col">
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className={`flex items-center gap-3 px-4 ${rowHeight} border-b border-ig-rule`}
      >
        <div className="h-11 w-11 shrink-0 rounded-full bg-ig-surface" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-3.5 w-32 rounded-media bg-ig-rule" />
          <div className="h-2.5 w-48 rounded-media bg-ig-surface" />
        </div>
      </div>
    ))}
  </div>
);

export const MessageListSkeleton = () => (
  <div role="status" aria-busy="true" className="flex flex-col gap-3 p-4">
    <div className="h-10 w-48 self-start rounded-panel bg-ig-surface" />
    <div className="h-12 w-60 self-end rounded-panel bg-ig-rule" />
    <div className="h-10 w-52 self-start rounded-panel bg-ig-surface" />
    <div className="h-10 w-40 self-end rounded-panel bg-ig-rule" />
  </div>
);

export default FlatBar;
