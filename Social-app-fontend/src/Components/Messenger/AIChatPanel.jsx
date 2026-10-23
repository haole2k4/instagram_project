import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Send, Sparkles, Trash2 } from "lucide-react";
import { getChatAI } from "../../Service/ChatAIApi";
import Route from "../../Components/Routes/index";

const getStorageKey = (userId) => `ig_ai_chat_history_${userId || "guest"}`;

const AIChatPanel = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.login?.userInfo);
  const storageKey = getStorageKey(currentUser?.id);

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // ignore storage quota errors
    }
  }, [messages, storageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [messages, isLoading, reducedMotion]);

  const buildContextualPrompt = (history, latestQuestion) => {
    const recent = history.slice(-6);
    if (recent.length === 0) return latestQuestion;
    const transcript = recent
      .map((m) => `${m.sender === "user" ? "User" : "Assistant"}: ${m.text}`)
      .join("\n");
    return `${transcript}\nUser: ${latestQuestion}`;
  };

  const handleSend = async (customText) => {
    const text = (customText ?? input).trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: "user",
      text,
      createdAt: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!customText) setInput("");
    setIsLoading(true);

    try {
      const promptPayload = buildContextualPrompt(messages, text);
      const response = await getChatAI(promptPayload);
      const replyText =
        typeof response === "string"
          ? response
          : response?.data || response?.reply || t("aiChat.error");

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: String(replyText),
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "ai",
          text: t("aiChat.error"),
          isError: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  const starterPrompts = [
    t("aiChat.prompt1"),
    t("aiChat.prompt2"),
    t("aiChat.prompt3"),
  ];

  return (
    <div className="flex h-full flex-1 flex-col bg-ig-ground text-ig-text">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-ig-border bg-ig-ground px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(Route.chat)}
            aria-label={t("messenger.back")}
            title={t("messenger.back")}
            className="ig-press flex h-9 w-9 items-center justify-center rounded-lg text-ig-muted hover:bg-ig-surface hover:text-ig-text md:hidden"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ig-border bg-ig-surface text-ig-text">
            <Sparkles size={16} strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-semibold leading-tight text-ig-text md:text-[24px]">
              {t("aiChat.title")}
            </h1>
            <p className="truncate text-[12px] text-ig-muted">
              {t("aiChat.subtitle")}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            aria-label={t("aiChat.clear")}
            title={t("aiChat.clear")}
            className="ig-press flex items-center gap-1.5 rounded-control border border-ig-border bg-ig-surface px-3 py-1.5 text-[12px] font-medium text-ig-muted hover:bg-ig-raised hover:text-ig-text"
          >
            <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
            <span className="hidden sm:inline">{t("aiChat.clear")}</span>
          </button>
        )}
      </header>

      {/* Khu vực nội dung ("Mình cần hỏi gì?") */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-ig-border bg-ig-surface text-ig-text">
              <Sparkles size={20} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <p className="text-[16px] font-medium text-ig-text">
              {t("aiChat.emptyTitle")}
            </p>
            <p className="mt-1 mb-6 text-[14px] text-ig-muted">
              {t("aiChat.emptyDesc")}
            </p>
            <div className="flex w-full flex-col gap-2">
              {starterPrompts.map((promptText, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(promptText)}
                  className="ig-press w-full rounded-panel border border-ig-border bg-ig-surface px-4 py-3 text-left text-[14px] text-ig-text hover:bg-ig-raised"
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`ig-msg-enter flex ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap break-words rounded-panel px-4 py-2.5 text-[14px] leading-relaxed ${
                      isUser
                        ? "bg-ig-accent text-ig-text"
                        : msg.isError
                        ? "border border-ig-like/50 bg-ig-surface text-ig-like"
                        : "border border-ig-border bg-ig-surface text-ig-text"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="ig-msg-enter flex justify-start">
                <div
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center rounded-panel border border-ig-border bg-ig-surface px-4 py-3 text-[14px] text-ig-muted"
                >
                  {reducedMotion ? (
                    <span>{t("aiChat.replying")}</span>
                  ) : (
                    <>
                      <span className="sr-only">{t("aiChat.replying")}</span>
                      <div
                        aria-hidden="true"
                        className="flex items-center gap-1.5"
                      >
                        <span
                          className="ig-typing-dot h-2 w-2 rounded-full bg-ig-muted"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="ig-typing-dot h-2 w-2 rounded-full bg-ig-muted"
                          style={{ animationDelay: "200ms" }}
                        />
                        <span
                          className="ig-typing-dot h-2 w-2 rounded-full bg-ig-muted"
                          style={{ animationDelay: "400ms" }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Thanh nhập câu hỏi */}
      <div className="border-t border-ig-border bg-ig-ground p-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-control border border-ig-border bg-ig-surface px-4 py-1.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            aria-label={t("aiChat.placeholder")}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("aiChat.placeholder")}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-transparent py-1.5 text-[14px] text-ig-text placeholder-ig-faint focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            aria-label={t("messenger.send")}
            title={t("messenger.send")}
            className="ig-press flex items-center gap-1.5 rounded-control bg-ig-accent px-3.5 py-1.5 text-[14px] font-semibold text-ig-text hover:opacity-90 disabled:opacity-40"
          >
            <Send size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>{t("messenger.send")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
