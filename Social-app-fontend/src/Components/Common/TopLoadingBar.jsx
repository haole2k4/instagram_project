import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

export const startTopLoading = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ig:loading:start"));
  }
};

export const completeTopLoading = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ig:loading:done"));
  }
};

const TopLoadingBar = () => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const location = useLocation();
  const timerRef = useRef(null);
  const stepTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  const clearAllTimers = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(stepTimerRef.current);
    clearTimeout(hideTimerRef.current);
  }, []);

  const finishProgress = useCallback(() => {
    clearAllTimers();
    setProgress(100);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
  }, [clearAllTimers]);

  const startProgress = useCallback(() => {
    clearAllTimers();
    setVisible(true);
    setProgress(15);

    timerRef.current = setTimeout(() => {
      setProgress(65);
    }, 120);

    stepTimerRef.current = setTimeout(() => {
      setProgress(85);
    }, 280);

    hideTimerRef.current = setTimeout(() => {
      finishProgress();
    }, 420);
  }, [clearAllTimers, finishProgress]);

  useEffect(() => {
    startProgress();
  }, [location.pathname, location.search, startProgress]);

  useEffect(() => {
    const handleStart = () => startProgress();
    const handleDone = () => finishProgress();

    window.addEventListener("ig:loading:start", handleStart);
    window.addEventListener("ig:loading:done", handleDone);

    return () => {
      window.removeEventListener("ig:loading:start", handleStart);
      window.removeEventListener("ig:loading:done", handleDone);
      clearAllTimers();
    };
  }, [startProgress, finishProgress, clearAllTimers]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 right-0 top-0 z-[99999] h-[2.5px] overflow-hidden"
    >
      <div
        className="h-full w-full origin-left transition-[transform,opacity] duration-200 ease-ui-out ig-top-gradient-bar"
        style={{
          transform: `scaleX(${progress / 100})`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
};

export default TopLoadingBar;
